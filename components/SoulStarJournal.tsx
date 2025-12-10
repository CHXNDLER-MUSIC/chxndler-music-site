"use client";

import { useState, useEffect, useRef } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { sfx } from "@/lib/sfx";
import { useDailyReflectionStatus } from "@/hooks/useDailyReflectionStatus";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getLocalDateString, getDisplayDateString } from "@/utils/dateHelpers";
import PopoutShell from "./PopoutShell";

interface DailyPrompt {
  id: string;
  prompt_date: string;
  element: string;
  intention: {
    id: string;
    text: string;
    element: string;
    prompt_type: string;
  };
  soul_star: {
    id: string;
    text: string;
    element: string;
    prompt_type: string;
  };
}

interface SoulStarJournalProps {
  isOpen: boolean;
  onClose: () => void;
  openWelcomeHome?: () => void;
  onJournalCompleted?: () => void;
}

interface JournalEntry {
  id: string;
  entry_date: string;
  created_at: string;
  element: string;
  intention?: string;
  reflection?: string; // prompt question text (was 'prompt')
  intention_response?: string;
  reflection_response?: string;
  soul_star?: string; // user's written reflection text
  is_private?: boolean;
}

type SoulJournalEntry = {
  entryDate: string;
  element: string | null;
  intention: string | null;
  prompt: string | null;
  soulStar: string | null;
  isPrivate: boolean;
};

interface JournalState {
  isLoading: boolean;
  saveMessage: string;
  errorMessage: string;
  isPrivate: boolean;
  isSubmitted: boolean;
}

// Element colors for theming
const ELEMENT_COLORS = {
  heart: { color: "#F91880", glow: "#F918B0" },
  water: { color: "#38B6FF", glow: "#38D6FF" },
  lightning: { color: "#F2EF1D", glow: "#FFFF00" },
  darkness: { color: "#FFFFFF", glow: "#E0E0E0" },
};

const ELEMENT_EMOJIS = {
  heart: "💖",
  water: "🌊",
  lightning: "⚡",
  darkness: "🌑",
};

export default function SoulStarJournal({ isOpen, onClose, openWelcomeHome, onJournalCompleted }: SoulStarJournalProps) {
  const { saveJournalEntry, journalEntries, profile, user, getDailyPrompts, deleteJournalEntry, updateJournalEntry, refreshProfile } = useProfile();
  const { hasPendingReflection, markReflectionComplete } = useDailyReflectionStatus();
  const [showHistory, setShowHistory] = useState(false);
  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editResponse, setEditResponse] = useState<string>("");
  const journalRef = useRef<HTMLDivElement>(null);
  
  // Component state variables as specified
  const [intentionText, setIntentionText] = useState<string>("");
  const [currentPromptText, setCurrentPromptText] = useState<string>("");
  const [soulStarText, setSoulStarText] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  
  const [journalState, setJournalState] = useState<JournalState>({
    isLoading: false,
    saveMessage: "",
    errorMessage: "",
    isPrivate: false,
    isSubmitted: false,
  });

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [hasClickedInitialButton, setHasClickedInitialButton] = useState(false);

  const today = getLocalDateString();
  const todayFormatted = getDisplayDateString();

  // Load daily prompt when opened
  useEffect(() => {
    if (isOpen) {
      loadDailyPrompt();
      setShowLoginPrompt(false);
      setHasClickedInitialButton(false);
    }
  }, [isOpen]);

  // Load existing entry on mount
  useEffect(() => {
    if (isOpen && dailyPrompt && journalEntries) {
      loadExistingEntry();
    }
  }, [isOpen, dailyPrompt, journalEntries]);

  // Update state variables when daily prompt loads
  useEffect(() => {
    if (dailyPrompt) {
      setIntentionText(dailyPrompt.intention?.text || "");
      setCurrentPromptText(dailyPrompt.soul_star?.text || "");
    }
  }, [dailyPrompt]);

  const loadDailyPrompt = async () => {
    try {
      const prompt = await getDailyPrompts();
      
      // Validate the prompt data before setting it (allow temporary placeholder values)
      if (prompt && prompt.id && 
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prompt.id) && 
          prompt.id !== 'relic-id-here') {
        console.error('Invalid prompt ID received:', prompt.id);
        throw new Error('Received corrupted prompt data from server');
      }
      
      // Additional validation for problematic values (excluding temporary relic-id-here)
      if (prompt && prompt.id && (
        (prompt.id.includes('relic') && prompt.id !== 'relic-id-here') ||
        prompt.id.includes('placeholder') ||
        prompt.id.includes('example')
      )) {
        console.error('Problematic prompt ID received:', prompt.id);
        throw new Error('Daily prompt contains placeholder data. Please refresh the page and try again.');
      }
      
      setDailyPrompt(prompt);
    } catch (error) {
      console.error('Failed to load daily prompt:', error);
      
      let errorMessage = "Unable to load today's soul prompt from database. Please contact support.";
      
      if (error instanceof Error) {
        if (error.message.includes('corrupted') || error.message.includes('placeholder')) {
          errorMessage = error.message;
        } else if (error.message.includes('Daily prompt data is corrupted')) {
          errorMessage = "The daily prompt data is corrupted. Please refresh the page and contact support if the issue persists.";
        }
      }
      
      setJournalState(prev => ({
        ...prev,
        errorMessage: errorMessage
      }));
    }
  };

  const loadExistingEntry = () => {
    if (!dailyPrompt?.element) return;

    const todayEntry = journalEntries.find(entry => 
      entry.entry_date === today && entry.element === dailyPrompt?.element
    );
    if (todayEntry) {
      // Check if soul_star contains corrupted prompt text and clear it
      const soulStarValue = todayEntry.soul_star || "";
      const isCorruptedWithPromptText = dailyPrompt && 
        (soulStarValue === dailyPrompt.soul_star?.text || 
         soulStarValue === currentPromptText);
      
      setSoulStarText(isCorruptedWithPromptText ? "" : soulStarValue);
      setJournalState(prev => ({
        ...prev,
        isPrivate: todayEntry.is_private ?? false,
        isSubmitted: !isCorruptedWithPromptText && !!(soulStarValue && soulStarValue.trim().length > 0),
      }));
    } else {
      setSoulStarText("");
      setJournalState(prev => ({
        ...prev,
        isPrivate: false,
        isSubmitted: false,
      }));
    }
  };

  const handleSaveEntry = async () => {
    try {
      // Validate user is signed in
      if (!user?.id) {
        setShowLoginPrompt(true);
        if (openWelcomeHome) {
          openWelcomeHome();
        }
        return;
      }

      // Validate soulStarText is not empty
      if (!soulStarText.trim()) {
        setError("Please write something in your Soul Star before casting it into the stars.");
        setTimeout(() => setError(""), 3000);
        return;
      }

      // Validate dailyPrompt is available and has valid data
      if (!dailyPrompt) {
        setError("Unable to save entry - daily prompt not loaded.");
        setTimeout(() => setError(""), 3000);
        return;
      }

      // Validate that the daily prompt has a proper UUID (allow temporary placeholder values)
      if (dailyPrompt.id && 
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dailyPrompt.id) && 
          dailyPrompt.id !== 'relic-id-here') {
        setError("Daily prompt data is corrupted. Please refresh the page and try again.");
        setTimeout(() => setError(""), 5000);
        return;
      }

      // Only set loading state after all validations pass
      setIsSaving(true);
      setError("");
      setSuccessMessage("");
      sfx.play('star', 0.8);

      // Debug logging to help identify the source of invalid UUIDs
      console.log('Saving journal entry - Daily prompt data:', {
        dailyPrompt,
        promptId: dailyPrompt?.id,
        isValidUUID: dailyPrompt?.id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dailyPrompt.id) : false
      });
      
      // Use ProfileContext's saveJournalEntry which handles upsert properly
      const entryDate = getLocalDateString();
      const result = await saveJournalEntry({
        entry_date: entryDate,
        element: dailyPrompt.element,
        prompt_id: dailyPrompt?.id || null,
        intention: dailyPrompt?.intention?.text || null,
        reflection: dailyPrompt?.soul_star?.text || null, // PROMPT QUESTION text goes to reflection column
        intention_response: null, // Could be used later for intention responses
        reflection_response: null, // Could be used later for separate reflection responses
        soul_star: soulStarText.trim(), // USER'S written reflection text
        is_private: journalState.isPrivate
      });

      if (!result) {
        throw new Error("Failed to save journal entry");
      }

      console.log('Successfully saved journal entry:', result);

      // Refresh profile data to update journal entries and reflection status
      await refreshProfile();
      
      // Mark reflection as complete to hide notifications (after a short delay to ensure profile refresh completes)
      setTimeout(() => {
        markReflectionComplete();
      }, 100);

      // Clear soulStarText and mark as submitted
      setSoulStarText("");
      setJournalState(prev => ({
        ...prev,
        isSubmitted: true
      }));
      
      // Notify parent that journal was completed
      onJournalCompleted?.();

    } catch (error) {
      console.error('Failed to save journal entry:', error);
      
      let errorMessage = "Failed to cast your signal. Please try again.";
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        if (error.message.includes('Authentication error') || error.message.includes('No user session')) {
          errorMessage = "Please log in again to save your entry.";
        } else if (error.message.includes('permission') || error.message.includes('auth')) {
          errorMessage = "Authentication error. Please refresh the page and try again.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message.includes('unique') || error.message.includes('constraint')) {
          errorMessage = "This entry already exists for today. Try editing the existing entry instead.";
        } else if (error.message.includes('column') && error.message.includes('does not exist')) {
          errorMessage = "Database schema error. Please contact support to update the database.";
        } else if (error.message.includes('table') && error.message.includes('not found')) {
          errorMessage = `Database table error. Please contact support. (${error.message})`;
        } else if (error.message.includes('Failed to save journal entry')) {
          errorMessage = `Database error: ${error.message.replace('Failed to save journal entry: ', '')}`;
        } else {
          errorMessage = `Database error: ${error.message}`;
        }
      } else if (typeof error === 'object' && error !== null) {
        const err = error as any;
        console.error('Full error object:', err);
        if (err?.message) {
          errorMessage = `Database error: ${err.message}`;
        } else {
          errorMessage = `Unknown error occurred: ${JSON.stringify(err)}`;
        }
      }
      
      setError(errorMessage);
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    sfx.play('close', 0.8);
    onClose();
  };

  const handleEntryClick = (entryId: string) => {
    sfx.play('click', 0.6);
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
    setEditingEntry(null);
  };

  const handleEditClick = (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    sfx.play('click', 0.6);
    setEditingEntry(entry.id);
    setEditResponse(entry.soul_star || "");
  };

  const handleSaveEdit = async (entryId: string) => {
    try {
      sfx.play('click', 0.8);
      await updateJournalEntry(entryId, { soul_star: editResponse.trim() });
      setEditingEntry(null);
      setEditResponse("");
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  const handleDeleteClick = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this journal entry?')) {
      try {
        sfx.play('click', 0.8);
        await deleteJournalEntry(entryId);
      } catch (error) {
        console.error('Failed to delete entry:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    sfx.play('click', 0.6);
    setEditingEntry(null);
    setEditResponse("");
  };

  if (!isOpen) return null;

  if (!dailyPrompt) {
    return null; // Don't show loading popup, just return null
  }

  const currentElement = dailyPrompt.element as keyof typeof ELEMENT_COLORS;
  const elementTheme = ELEMENT_COLORS[currentElement] || ELEMENT_COLORS.heart;
  const elementEmoji = ELEMENT_EMOJIS[currentElement] || "💖";

  return (
    <div 
      className="fixed z-[2147483649] flex items-center justify-center"
      style={{ 
        top: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(99vw, 1000px)'
      }}
    >

      {/* Holographic base glow */}
      <div 
        className="absolute"
        style={{
          width: 'min(120vw, 800px)',
          height: '250px',
          top: '50%',
          left: '50%',
          transform: 'translateX(-50%) translateY(-50%)',
          background: `radial-gradient(ellipse, ${elementTheme.color}15, transparent 70%)`,
          borderRadius: '50%',
          filter: 'blur(30px)',
          zIndex: -2
        }}
      />

      {/* Secondary glow layer */}
      <div 
        className="absolute"
        style={{
          width: 'min(100vw, 600px)',
          height: '200px',
          top: '50%',
          left: '50%',
          transform: 'translateX(-50%) translateY(-50%)',
          background: `radial-gradient(ellipse, ${elementTheme.color}08, transparent 60%)`,
          borderRadius: '50%',
          filter: 'blur(20px)',
          zIndex: -1
        }}
      />

      {/* Animated particles/sparks */}
      <div 
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: -1 }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-pulse"
            style={{
              background: elementTheme.color,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              boxShadow: `0 0 6px ${elementTheme.color}, 0 0 12px ${elementTheme.color}40`,
              opacity: 0.6
            }}
          />
        ))}
      </div>




      {showHistory ? (
        /* History View - Show list of existing entries */
        <div style={{ 
          height: '400px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {/* Title Section with FULL LOG button and title */}
            <div className="text-center mb-2 relative">
              {/* Full Log Button - Left of Title */}
              <button
                onClick={() => {
                  console.log('FULL LOG button clicked!');
                  try {
                    sfx.play('click', 0.8);
                  } catch (e) {
                    console.log('SFX not available');
                  }
                  setShowHistory(!showHistory);
                }}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs font-semibold transition-all duration-200 hover:opacity-100 px-3 py-1 rounded z-20"
                style={{
                  color: '#FFD700',
                  textShadow: `0 0 8px #FFD700, 0 0 15px #FFFF00`,
                  opacity: showHistory ? 1 : 0.8,
                  background: '#FFD70020',
                  border: `2px solid #FFD700`,
                  boxShadow: `0 0 12px #FFD700, 0 0 20px #FFD70060`,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  zIndex: 20
                }}
              >
                {showHistory ? 'TODAY\'S ENTRY' : 'FULL LOG'}
              </button>

              {/* Close Button - Right of Title */}
              <button 
                onClick={handleClose}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-white hover:bg-red-600/20 transition-all duration-200 z-20"
                style={{
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: `1px solid ${elementTheme.color}60`,
                  boxShadow: `0 0 15px ${elementTheme.color}20`,
                  fontSize: '16px'
                }}
                aria-label="Close journal"
              >
                ×
              </button>

              {/* SOUL STAR JOURNAL Title */}
              <div 
                className="text-lg font-bold tracking-wider mb-2"
                style={{
                  color: elementTheme.color,
                  textShadow: `0 0 15px ${elementTheme.glow}, 0 0 30px ${elementTheme.glow}`,
                  filter: `drop-shadow(0 0 8px ${elementTheme.color})`
                }}
              >
                SOUL STAR JOURNAL
              </div>
              
              {/* Yellow line below title */}
              <div 
                className="mx-auto"
                style={{
                  width: '300px',
                  height: '2px',
                  background: '#F2EF1D',
                  boxShadow: '0 0 8px #F2EF1D, 0 0 15px #FFFF00'
                }}
              />
            </div>
            
            {/* Show existing journal entries if available */}
            {(() => {
              const filteredEntries = journalEntries
                ? journalEntries.filter((entry: JournalEntry) => entry.soul_star && entry.soul_star.trim().length > 0)
                : [];
              
              return filteredEntries.length > 0 ? (
                filteredEntries
                  .sort((a: JournalEntry, b: JournalEntry) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
                  .slice(0, 10) // Show last 10 entries
                  .map((entry: JournalEntry) => {
                  const entryElementTheme = ELEMENT_COLORS[entry.element as keyof typeof ELEMENT_COLORS] || ELEMENT_COLORS.heart;
                  const entryElementEmoji = ELEMENT_EMOJIS[entry.element as keyof typeof ELEMENT_EMOJIS] || "💖";
                  const entryDate = new Date(entry.entry_date).toLocaleDateString();
                  
                  return (
                    <div 
                      key={entry.id}
                      className="rounded-lg p-3 mb-3"
                      style={{
                        background: `${entryElementTheme.color}08`,
                        border: `1px solid ${entryElementTheme.color}30`,
                        borderLeft: `4px solid ${entryElementTheme.color}`
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-sm font-semibold" style={{ color: entryElementTheme.color }}>
                          {entryDate}
                        </div>
                        <span 
                          className="text-xs px-2 py-1 rounded-full uppercase font-semibold flex items-center gap-1"
                          style={{
                            background: `${entryElementTheme.color}15`,
                            color: entryElementTheme.color,
                            border: `1px solid ${entryElementTheme.color}40`
                          }}
                        >
                          {entryElementEmoji} {entry.element.toUpperCase()}
                        </span>
                        {entry.is_private && (
                          <span 
                            className="text-xs px-1 py-0.5 rounded uppercase font-semibold"
                            style={{
                              background: '#FF69B415',
                              color: '#FF69B4',
                              border: '1px solid #FF69B440'
                            }}
                          >
                            PRIVATE
                          </span>
                        )}
                      </div>
                      
                      <div 
                        className="text-sm leading-relaxed"
                        style={{ 
                          color: '#FFFFFF',
                          background: 'rgba(0,0,0,0.2)',
                          padding: '8px',
                          borderRadius: '6px',
                          border: `1px solid ${entryElementTheme.color}15`
                        }}
                      >
                        {entry.soul_star}
                      </div>
                    </div>
                  );
                })
              ) : (
              /* No real entries exist - show message and sample entries */
              <div>
                <div 
                  className="text-center mb-4 p-3 rounded-lg"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${elementTheme.color}30`,
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  {user?.id ? 'No journal entries yet. Start writing to see your entries here!' : 'Sign in to see your journal entries.'}
                </div>
                
                {/* Sample entries for demonstration */}
                
                <div 
                  className="rounded-lg p-3 mb-3 opacity-60"
                  style={{
                    background: '#F2EF1D08',
                    border: '1px solid #F2EF1D30',
                    borderLeft: '4px solid #F2EF1D'
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-sm font-semibold" style={{ color: '#F2EF1D' }}>
                      12/9/2025
                    </div>
                    <span 
                      className="text-xs px-2 py-1 rounded-full uppercase font-semibold flex items-center gap-1"
                      style={{
                        background: '#F2EF1D15',
                        color: '#F2EF1D',
                        border: '1px solid #F2EF1D40'
                      }}
                    >
                      ⚡ LIGHTNING
                    </span>
                  </div>
                  
                  <div 
                    className="text-sm leading-relaxed"
                    style={{ 
                      color: '#FFFFFF',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #F2EF1D15'
                    }}
                  >
                    Today I felt a surge of creative energy while working on my music. The lightning element really resonated with my breakthrough moment.
                  </div>
                </div>

                <div 
                  className="rounded-lg p-3 opacity-60"
                  style={{
                    background: '#FF69B408',
                    border: '1px solid #FF69B430',
                    borderLeft: '4px solid #FF69B4'
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-sm font-semibold" style={{ color: '#FF69B4' }}>
                      12/8/2025
                    </div>
                    <span 
                      className="text-xs px-2 py-1 rounded-full uppercase font-semibold flex items-center gap-1"
                      style={{
                        background: '#FF69B415',
                        color: '#FF69B4',
                        border: '1px solid #FF69B440'
                      }}
                    >
                      💖 HEART
                    </span>
                  </div>
                  
                  <div 
                    className="text-sm leading-relaxed"
                    style={{ 
                      color: '#FFFFFF',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #FF69B415'
                    }}
                  >
                    Spent time with family today. Felt gratitude for the connections in my life and the warmth of shared moments.
                  </div>
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* Today's Journal Interface */
        <div style={{ 
          height: '400px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          backdropFilter: 'blur(8px)'
        }}>
          {/* Main Entry Card Container */}
          <div 
            className="rounded-lg px-1 py-2 space-y-4 sm:space-y-5"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              border: `1px solid ${elementTheme.color}40`,
              boxShadow: `0 0 20px ${elementTheme.color}20, 0 0 40px ${elementTheme.color}10`,
              borderRadius: '12px'
            }}
          >
            {/* Title Section */}
            <div className="text-center mb-2 relative">
              {/* Full Log Button - Left of Title */}
              <button
                onClick={() => {
                  console.log('FULL LOG button clicked!');
                  try {
                    sfx.play('click', 0.8);
                  } catch (e) {
                    console.log('SFX not available');
                  }
                  setShowHistory(!showHistory);
                }}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs font-semibold transition-all duration-200 hover:opacity-100 px-3 py-1 rounded z-20"
                style={{
                  color: '#FFD700',
                  textShadow: `0 0 8px #FFD700, 0 0 15px #FFFF00`,
                  opacity: showHistory ? 1 : 0.8,
                  background: '#FFD70020',
                  border: `2px solid #FFD700`,
                  boxShadow: `0 0 12px #FFD700, 0 0 20px #FFD70060`,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  zIndex: 20
                }}
              >
                {showHistory ? 'TODAY\'S ENTRY' : 'FULL LOG'}
              </button>

              {/* Close Button - Right of Title */}
              <button 
                onClick={handleClose}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-white hover:bg-red-600/20 transition-all duration-200 z-20"
                style={{
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: `1px solid ${elementTheme.color}60`,
                  boxShadow: `0 0 15px ${elementTheme.color}20`,
                  fontSize: '16px'
                }}
                aria-label="Close journal"
              >
                ×
              </button>

              {/* SOUL STAR JOURNAL Title */}
              <div 
                className="text-lg font-bold tracking-wider mb-2"
                style={{
                  color: elementTheme.color,
                  textShadow: `0 0 15px ${elementTheme.glow}, 0 0 30px ${elementTheme.glow}`,
                  filter: `drop-shadow(0 0 8px ${elementTheme.color})`
                }}
              >
                SOUL STAR JOURNAL
              </div>
              
              {/* Yellow line below title */}
              <div 
                className="mx-auto"
                style={{
                  width: '300px',
                  height: '2px',
                  background: '#F2EF1D',
                  boxShadow: '0 0 8px #F2EF1D, 0 0 15px #FFFF00'
                }}
              />
            </div>

            {/* Header Layout - Date and Element */}
            <div className="relative pb-6">
              {/* Date - Top Center */}
              <div 
                className="absolute top-0 left-1/2 transform -translate-x-1/2 text-lg font-semibold"
                style={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  textShadow: `1px 1px 3px rgba(0, 0, 0, 0.7), 0 0 10px rgba(0, 0, 0, 0.5)`,
                  filter: `drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.8))`
                }}
              >
                12/10/2025
              </div>

              {/* Privacy Toggle - Top Right */}
              <button
                onClick={() => {
                  console.log('Privacy button clicked!', journalState.isPrivate);
                  try {
                    sfx.play('click', 0.8);
                  } catch (e) {
                    console.log('SFX not available');
                  }
                  setJournalState(prev => ({ ...prev, isPrivate: !prev.isPrivate }));
                }}
                disabled={journalState.isSubmitted}
                className="absolute top-0 right-0 px-2 py-1 rounded text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed z-10"
                style={{
                  background: journalState.isPrivate ? '#FF69B420' : `${elementTheme.color}20`,
                  border: `1px solid ${journalState.isPrivate ? '#FF69B4' : elementTheme.color}60`,
                  color: journalState.isPrivate ? '#FF69B4' : elementTheme.color,
                  textShadow: journalState.isPrivate ? '0 0 4px #FF69B4' : `0 0 4px ${elementTheme.glow}`,
                  opacity: journalState.isSubmitted ? 0.4 : 1,
                  cursor: journalState.isSubmitted ? 'not-allowed' : 'pointer',
                  pointerEvents: 'auto',
                  zIndex: 10
                }}
              >
                {journalState.isPrivate ? 'PRIVATE' : 'PUBLIC'}
              </button>
              
              {/* LIGHTNING Element - Top Left */}
              <div 
                className="absolute top-0 left-0 px-3 py-1 rounded-full text-xs font-semibold uppercase flex items-center gap-2"
                style={{
                  background: `${elementTheme.color}20`,
                  color: elementTheme.color,
                  border: `1px solid ${elementTheme.color}60`,
                  textShadow: `0 0 4px ${elementTheme.glow}`
                }}
              >
                {elementEmoji} {dailyPrompt?.element?.toUpperCase()}
              </div>
            </div>

            {/* Section Cards */}
            {dailyPrompt && (
              <div className="space-y-0.5">
                {/* Intention Card */}
                <div 
                  className="rounded-lg px-1 pt-0.5 pb-1 -mx-1"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `2px solid ${elementTheme.color}`,
                    boxShadow: `0 0 15px ${elementTheme.color}60, 0 0 30px ${elementTheme.color}30, inset 0 0 10px ${elementTheme.color}20`
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 flex items-center justify-center relative"
                        style={{
                          background: `radial-gradient(circle, ${elementTheme.color}30, transparent 70%)`,
                          filter: `drop-shadow(0 0 4px ${elementTheme.color})`
                        }}
                      >
                        <svg 
                          width="18" 
                          height="18" 
                          viewBox="0 0 24 24" 
                          fill="none"
                          style={{
                            filter: `drop-shadow(0 0 6px ${elementTheme.color}) drop-shadow(0 0 12px ${elementTheme.color}40)`
                          }}
                        >
                          <circle 
                            cx="12" 
                            cy="12" 
                            r="9" 
                            fill="none"
                            stroke={elementTheme.color}
                            strokeWidth="2"
                            strokeDasharray="3 3"
                          />
                          <circle 
                            cx="12" 
                            cy="12" 
                            r="3" 
                            fill={elementTheme.color}
                          />
                          <path 
                            d="M12 3v6m0 6v6m-9-9h6m6 0h6" 
                            stroke={elementTheme.color}
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div 
                          className="absolute inset-0 rounded-full animate-pulse"
                          style={{
                            background: `radial-gradient(circle, ${elementTheme.color}20, transparent 60%)`,
                            animation: 'pulse 2s infinite'
                          }}
                        />
                      </div>
                      <div 
                        className="text-sm font-semibold uppercase tracking-wider"
                        style={{ color: elementTheme.color, textShadow: `0 0 4px ${elementTheme.glow}` }}
                      >
                        Intention
                      </div>
                    </div>
                    <div 
                      className="text-sm leading-relaxed"
                      style={{ color: '#FFFFFF', lineHeight: '1.5' }}
                    >
                      {dailyPrompt.intention.text}
                    </div>
                  </div>
                </div>

                {/* Prompt Card */}
                <div 
                  className="rounded-lg px-1 pt-0.5 pb-1 -mx-1"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `2px solid ${elementTheme.color}`,
                    boxShadow: `0 0 15px ${elementTheme.color}60, 0 0 30px ${elementTheme.color}30, inset 0 0 10px ${elementTheme.color}20`
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 flex items-center justify-center relative"
                        style={{
                          background: `radial-gradient(circle, ${elementTheme.color}30, transparent 70%)`,
                          filter: `drop-shadow(0 0 4px ${elementTheme.color})`
                        }}
                      >
                        <svg 
                          width="18" 
                          height="18" 
                          viewBox="0 0 24 24" 
                          fill="none"
                          style={{
                            filter: `drop-shadow(0 0 6px ${elementTheme.color}) drop-shadow(0 0 12px ${elementTheme.color}40)`
                          }}
                        >
                          <path 
                            d="M8 9h8M8 12h8M8 15h6" 
                            stroke={elementTheme.color}
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path 
                            d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" 
                            stroke={elementTheme.color}
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle 
                            cx="19" 
                            cy="8" 
                            r="2" 
                            fill={elementTheme.color}
                            opacity="0.8"
                          />
                        </svg>
                        <div 
                          className="absolute inset-0 rounded-full animate-pulse"
                          style={{
                            background: `radial-gradient(circle, ${elementTheme.color}20, transparent 60%)`,
                            animation: 'pulse 2s infinite'
                          }}
                        />
                      </div>
                      <div 
                        className="text-sm font-semibold uppercase tracking-wider"
                        style={{ color: elementTheme.color, textShadow: `0 0 4px ${elementTheme.glow}` }}
                      >
                        Prompt
                      </div>
                    </div>
                    <div 
                      className="text-sm leading-relaxed"
                      style={{ 
                        color: dailyPrompt.soul_star?.text ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)', 
                        lineHeight: '1.5' 
                      }}
                    >
                      {dailyPrompt.soul_star?.text || 'No prompt was generated for this day.'}
                    </div>
                  </div>
                </div>

                {/* Soul Star Card */}
                <div 
                  className="rounded-lg px-1 pt-0.5 pb-0.5 -mx-1"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `2px solid ${elementTheme.color}`,
                    boxShadow: `0 0 15px ${elementTheme.color}60, 0 0 30px ${elementTheme.color}30, inset 0 0 10px ${elementTheme.color}20`
                  }}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 flex items-center justify-center relative"
                        style={{
                          background: `radial-gradient(circle, ${elementTheme.color}30, transparent 70%)`,
                          filter: `drop-shadow(0 0 4px ${elementTheme.color})`
                        }}
                      >
                        <svg 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none"
                          style={{
                            filter: `drop-shadow(0 0 6px ${elementTheme.color}) drop-shadow(0 0 12px ${elementTheme.color}40)`
                          }}
                        >
                          <path 
                            d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" 
                            fill={elementTheme.color}
                            stroke={elementTheme.color}
                            strokeWidth="0.5"
                          />
                          <circle 
                            cx="12" 
                            cy="12" 
                            r="8" 
                            fill="none"
                            stroke={elementTheme.color}
                            strokeWidth="1"
                            opacity="0.6"
                          />
                        </svg>
                        <div 
                          className="absolute inset-0 rounded-full animate-pulse"
                          style={{
                            background: `radial-gradient(circle, ${elementTheme.color}20, transparent 60%)`,
                            animation: 'pulse 2s infinite'
                          }}
                        />
                      </div>
                      <div 
                        className="text-base font-semibold uppercase tracking-wider"
                        style={{ color: elementTheme.color, textShadow: `0 0 4px ${elementTheme.glow}` }}
                      >
                        Soul Star
                      </div>
                    </div>
                    
                    <textarea
                      value={soulStarText}
                      onChange={(e) => setSoulStarText(e.target.value)}
                      placeholder={(!user?.id || !profile?.element) ? "Let your Soul speak..." : "Let your Soul Star speak…"}
                      className="w-full h-14 p-3 rounded-lg text-white placeholder-white/50 resize-none focus:outline-none transition-all"
                      disabled={isSaving || journalState.isSubmitted}
                      style={{
                        background: 'rgba(0,0,0,0.4)',
                        border: `1px solid ${elementTheme.color}30`,
                        boxShadow: `0 0 8px ${elementTheme.color}15`,
                        opacity: (isSaving || journalState.isSubmitted) ? 0.7 : 1,
                        pointerEvents: (isSaving || journalState.isSubmitted) ? 'none' as any : 'auto',
                        lineHeight: '1.5'
                      }}
                      onFocus={(e) => {
                        if (journalState.isSubmitted) return;
                        e.target.style.borderColor = `${elementTheme.color}60`;
                        e.target.style.boxShadow = `0 0 15px ${elementTheme.glow}`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = `${elementTheme.color}30`;
                        e.target.style.boxShadow = `0 0 8px ${elementTheme.color}15`;
                      }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  {(!user?.id || !profile?.element) ? (
                    <button
                      onClick={() => {
                        sfx.play('button', 0.8);
                        if (!hasClickedInitialButton) {
                          setHasClickedInitialButton(true);
                        } else {
                          // Close journal and open welcome home immediately
                          onClose();
                          setTimeout(() => {
                            if (openWelcomeHome) {
                              openWelcomeHome();
                            }
                          }, 100);
                        }
                      }}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90"
                      style={{
                        background: `linear-gradient(135deg, ${elementTheme.color}60, ${elementTheme.color}80)`,
                        color: '#000000',
                        border: `1px solid ${elementTheme.color}`,
                        boxShadow: `0 0 20px ${elementTheme.color}40, inset 0 0 10px ${elementTheme.color}20`,
                        textShadow: 'none'
                      }}
                    >
                      {!hasClickedInitialButton ? 'CAST YOUR SOUL STAR' : 'Create ALIEN profile to submit'}
                    </button>
                  ) : (
                    <button
                      onClick={journalState.isSubmitted ? undefined : handleSaveEntry}
                      disabled={!journalState.isSubmitted && (!soulStarText.trim() || isSaving)}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                      style={{
                        background: journalState.isSubmitted 
                          ? 'rgba(34, 197, 94, 0.2)' 
                          : `linear-gradient(135deg, ${elementTheme.color}60, ${elementTheme.color}80)`,
                        color: journalState.isSubmitted ? '#22C55E' : '#000000',
                        border: journalState.isSubmitted 
                          ? '1px solid #22C55E60' 
                          : `1px solid ${elementTheme.color}`,
                        boxShadow: journalState.isSubmitted 
                          ? '0 0 20px #22C55E20' 
                          : `0 0 20px ${elementTheme.color}40, inset 0 0 10px ${elementTheme.color}20`,
                        textShadow: journalState.isSubmitted 
                          ? '0 0 8px #22C55E' 
                          : 'none',
                        cursor: (journalState.isSubmitted || !soulStarText.trim() || isSaving) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {journalState.isSubmitted
                        ? 'Your soul star shines above'
                        : (isSaving ? 'CASTING...' : 'CAST INTO THE STARS')}
                    </button>
                  )}
                </div>

                {/* Messages */}
                {(error || journalState.errorMessage) && (
                  <div 
                    className="p-3 rounded-lg text-center text-red-400 text-sm"
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    {error || journalState.errorMessage}
                  </div>
                )}

                {(successMessage || journalState.saveMessage) && (
                  <div 
                    className="p-3 rounded-lg text-center text-sm"
                    style={{ 
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      color: '#22C55E',
                      textShadow: '0 0 8px #22C55E'
                    }}
                  >
                    ✨ {successMessage || journalState.saveMessage} ✨
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}