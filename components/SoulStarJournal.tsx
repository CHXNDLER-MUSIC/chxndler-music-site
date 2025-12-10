"use client";

import { useState, useEffect, useRef } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { sfx } from "@/lib/sfx";
import { useDailyReflectionStatus } from "@/hooks/useDailyReflectionStatus";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getLocalDateString, getDisplayDateString } from "@/utils/dateHelpers";

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
  const { saveJournalEntry, journalEntries, profile, user, getDailyPrompts, deleteJournalEntry, updateJournalEntry } = useProfile();
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

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (journalRef.current && !journalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

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

      // Mark reflection as complete to hide notifications
      markReflectionComplete();

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
      className="fixed z-[2147483647] flex items-center justify-center"
      style={{ 
        top: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(92vw, 600px)'
      }}
    >

      {/* Holographic base glow */}
      <div 
        className="absolute"
        style={{
          width: 'min(120vw, 800px)',
          height: '250px',
          background: `radial-gradient(ellipse 90% 100% at 50% 0%, ${elementTheme.glow} 0%, ${elementTheme.color}50 25%, ${elementTheme.color}20 50%, transparent 100%)`,
          filter: 'blur(120px)',
          transform: 'translateY(40px)'
        }}
      />
      
      {/* Additional ambient glow layer */}
      <div 
        className="absolute"
        style={{
          width: 'min(100vw, 700px)',
          height: '400px',
          background: `radial-gradient(ellipse 70% 80% at 50% 20%, ${elementTheme.glow}30 0%, ${elementTheme.color}20 40%, transparent 70%)`,
          filter: 'blur(80px)',
          transform: 'translateY(-20px)',
          zIndex: -2
        }}
      />
      
      {/* Modal Container */}
      <div
        ref={journalRef}
        className="relative soul-journal-container"
        style={{
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: '20px 24px 12px 24px',
          borderRadius: 18,
          background: 'rgba(0, 0, 0, 0.9)',
          border: hasPendingReflection && !showHistory
            ? `2px solid ${elementTheme.color}`
            : `2px solid ${elementTheme.color}`,
          boxShadow: hasPendingReflection && !showHistory
            ? `0 -12px 40px ${elementTheme.glow}, 0 -6px 25px ${elementTheme.color}80, 0 16px 50px rgba(0,0,0,0.6), 0 0 40px ${elementTheme.glow}, 0 0 80px ${elementTheme.color}60, 0 0 120px ${elementTheme.color}30`
            : `0 -10px 35px ${elementTheme.glow}, 0 -5px 20px ${elementTheme.color}60, 0 14px 40px rgba(0,0,0,0.5), 0 0 35px ${elementTheme.glow}, 0 0 60px ${elementTheme.color}40, 0 0 100px ${elementTheme.color}20`,
          backdropFilter: 'blur(16px) saturate(140%)',
          color: '#FFFFFF'
        }}
      >
        {/* Top glow */}
        <div 
          className="absolute"
          style={{
            top: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            height: '30px',
            background: `radial-gradient(ellipse 80% 100% at 50% 100%, ${elementTheme.glow} 0%, ${elementTheme.color}50 40%, ${elementTheme.color}20 70%, transparent 100%)`,
            filter: 'blur(35px)',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {/* Full Log Button - Top Left */}
        <button
          onClick={(!user?.id || !profile?.element) ? undefined : () => {
            sfx.play('click', 0.8);
            setShowHistory(!showHistory);
          }}
          disabled={!user?.id || !profile?.element}
          className="absolute top-3 left-4 text-xs font-semibold transition-all duration-200 hover:opacity-100 px-2 py-1 rounded disabled:cursor-not-allowed"
          style={{
            color: (!user?.id || !profile?.element) ? '#808080' : elementTheme.color,
            textShadow: (!user?.id || !profile?.element) ? 'none' : `0 0 4px ${elementTheme.glow}`,
            opacity: (!user?.id || !profile?.element) ? 0.4 : (showHistory ? 1 : 0.8),
            background: 'transparent',
            border: (!user?.id || !profile?.element) ? '1px solid #808080' : '1px solid #F2EF1D',
            boxShadow: (!user?.id || !profile?.element) ? 'none' : '0 0 8px #F2EF1D, 0 0 15px #FFFF00',
            cursor: (!user?.id || !profile?.element) ? 'not-allowed' : 'pointer'
          }}
        >
          FULL LOG
        </button>

        {/* Heart Element Button - Top Left under FULL LOG */}
        {!showHistory && (
          <button
            className="absolute top-16 left-4 text-xs font-semibold transition-all duration-200 hover:opacity-100 px-2 py-1 rounded"
            style={{
              background: `${elementTheme.color}20`,
              border: `1px solid ${elementTheme.color}60`,
              color: elementTheme.color,
              textShadow: `0 0 4px ${elementTheme.glow}`
            }}
          >
            ELEMENT: {dailyPrompt.element.toUpperCase()}
          </button>
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-4 w-8 h-8 rounded-full border flex items-center justify-center transition-all"
          style={{ 
            fontSize: '16px',
            borderColor: `${elementTheme.color}cc`,
            color: elementTheme.color,
            boxShadow: `0 0 15px ${elementTheme.glow}, 0 0 25px ${elementTheme.color}50`,
            textShadow: `0 0 8px ${elementTheme.glow}`,
            background: `${elementTheme.color}10`,
            backdropFilter: 'blur(2px)'
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Privacy Toggle - positioned under close button */}
        <button
          onClick={(!user?.id || !profile?.element) ? undefined : () => {
            sfx.play('click', 0.8);
            setJournalState(prev => ({ ...prev, isPrivate: !prev.isPrivate }));
          }}
          disabled={!user?.id || !profile?.element || journalState.isSubmitted}
          className="absolute top-16 right-4 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed"
          style={{
            background: (!user?.id || !profile?.element) ? 'rgba(128, 128, 128, 0.1)' : (journalState.isPrivate ? `${elementTheme.color}20` : 'rgba(128, 128, 128, 0.1)'),
            border: (!user?.id || !profile?.element) ? '1px solid #50505060' : `1px solid ${journalState.isPrivate ? elementTheme.color : '#808080'}60`,
            color: (!user?.id || !profile?.element) ? '#505050' : (journalState.isPrivate ? elementTheme.color : '#808080'),
            textShadow: (!user?.id || !profile?.element) ? 'none' : (journalState.isPrivate ? `0 0 4px ${elementTheme.glow}` : 'none'),
            opacity: (!user?.id || !profile?.element || journalState.isSubmitted) ? 0.4 : (journalState.isPrivate ? 1 : 0.5),
            cursor: (!user?.id || !profile?.element || journalState.isSubmitted) ? 'not-allowed' : 'pointer'
          }}
        >
          PRIVATE
        </button>
        
        {/* Header */}
        <div 
          className="text-center mb-1"
          style={{ 
            color: elementTheme.color,
            textShadow: `0 0 8px ${elementTheme.glow}`,
            fontSize: '18px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          SOUL STAR JOURNAL
          {/* Yellow underline */}
          <div 
            className="mt-2"
            style={{
              width: '100%',
              height: '1px',
              background: '#F2EF1D',
              boxShadow: '0 0 4px #F2EF1D, 0 0 8px #FFFF00'
            }}
          />
        </div>

        {showHistory ? (
          /* History View */
          <div className="space-y-2 overflow-y-auto" style={{ height: '400px' }}>
            {journalEntries.length === 0 ? (
              <div 
                className="text-center p-6 rounded-lg"
                style={{ 
                  background: `${elementTheme.color}10`,
                  border: `1px solid ${elementTheme.color}40`,
                  color: elementTheme.color,
                  textShadow: `0 0 4px ${elementTheme.glow}`
                }}
              >
                <div className="text-lg mb-2">📖 Your journal awaits</div>
                <div className="text-sm opacity-80">Start by writing your first Soul Star entry</div>
              </div>
            ) : (
              journalEntries.map((entry) => {
                // Parse date in EST timezone to avoid timezone shift issues
                const entryDate = (() => {
                  // Force parsing in EST timezone by appending 'T12:00:00' (noon EST) to avoid UTC midnight issues
                  let dateStr = entry.entry_date;
                  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // If it's YYYY-MM-DD format, add noon time to prevent timezone shifting
                    dateStr += 'T12:00:00';
                  }
                  
                  const date = new Date(dateStr);
                  return date.toLocaleDateString('en-US', {
                    timeZone: 'America/New_York',
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric'
                  });
                })();
                const entryColor = ELEMENT_COLORS[entry.element as keyof typeof ELEMENT_COLORS]?.color || elementTheme.color;
                const entryEmoji = ELEMENT_EMOJIS[entry.element as keyof typeof ELEMENT_EMOJIS] || "💖";
                const isExpanded = expandedEntry === entry.id;
                const isEditing = editingEntry === entry.id;
                
                return (
                  <div 
                    key={entry.id}
                    className="rounded-lg overflow-hidden"
                    style={{
                      background: `${entryColor}08`,
                      border: `1px solid ${entryColor}30`,
                      borderLeft: `4px solid ${entryColor}`
                    }}
                  >
                    {/* Single line view */}
                    <div 
                      className="p-3 cursor-pointer hover:bg-black/20 flex items-center justify-between"
                      onClick={() => handleEntryClick(entry.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold" style={{ color: entryColor }}>
                          {entryDate}
                        </div>
                        <span 
                          className="text-xs px-2 py-1 rounded-full uppercase font-semibold flex items-center gap-1"
                          style={{
                            background: `${entryColor}15`,
                            color: entryColor,
                            border: `1px solid ${entryColor}40`
                          }}
                        >
                          {entryEmoji} {entry.element}
                        </span>
                        {/* Privacy indicator */}
                        {entry.is_private && (
                          <span 
                            className="text-xs px-2 py-1 rounded-full uppercase font-semibold"
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              color: '#FFFFFF',
                              border: '1px solid rgba(255, 255, 255, 0.3)'
                            }}
                          >
                            PRIVATE
                          </span>
                        )}
                        {/* Preview of first few words */}
                        <div 
                          className="text-xs opacity-70 truncate flex-1"
                          style={{ color: '#FFFFFF', maxWidth: '200px' }}
                        >
                          {entry.soul_star ? entry.soul_star.substring(0, 50) + (entry.soul_star.length > 50 ? '...' : '') : 'No entry'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Privacy toggle button */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            sfx.play('click', 0.6);
                            try {
                              await updateJournalEntry(entry.id, { is_private: !entry.is_private });
                            } catch (error) {
                              console.error('Failed to update privacy:', error);
                            }
                          }}
                          className="px-2 py-1 rounded text-xs transition-all opacity-60 hover:opacity-100"
                          style={{
                            color: entry.is_private ? entryColor : '#808080',
                            background: entry.is_private ? `${entryColor}10` : 'rgba(128, 128, 128, 0.1)',
                            border: `1px solid ${entry.is_private ? entryColor : '#808080'}40`
                          }}
                          title={entry.is_private ? "Make public" : "Make private"}
                        >
                          {entry.is_private ? 'PVT' : 'PUB'}
                        </button>
                        
                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDeleteClick(entry.id, e)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all opacity-60 hover:opacity-100"
                          style={{
                            color: '#ff4444',
                            background: 'rgba(255, 68, 68, 0.1)',
                            border: '1px solid rgba(255, 68, 68, 0.3)'
                          }}
                          title="Delete entry"
                        >
                          ×
                        </button>
                        
                        {/* Expand indicator */}
                        <div 
                          className="text-xs opacity-50"
                          style={{ color: entryColor }}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded view */}
                    {isExpanded && (
                      <div 
                        className="px-4 pb-4 space-y-3"
                        style={{
                          borderTop: `1px solid ${entryColor}20`
                        }}
                      >
                        {/* Today's Intention */}
                        {entry.intention && (
                          <div>
                            <div 
                              className="text-xs font-semibold mb-1 uppercase tracking-wider"
                              style={{ color: entryColor, textShadow: `0 0 2px ${entryColor}50` }}
                            >
                              Intention
                            </div>
                            <div 
                              className="text-sm leading-relaxed"
                              style={{ 
                                color: '#FFFFFF',
                                background: 'rgba(0,0,0,0.2)',
                                padding: '8px',
                                borderRadius: '6px',
                                border: `1px solid ${entryColor}15`
                              }}
                            >
                              {entry.intention}
                            </div>
                          </div>
                        )}
                        
                        {/* Prompt */}
                        <div>
                          <div 
                            className="text-xs font-semibold mb-1 uppercase tracking-wider"
                            style={{ color: entryColor, textShadow: `0 0 2px ${entryColor}50` }}
                          >
                            Prompt
                          </div>
                          <div 
                            className="text-sm leading-relaxed"
                            style={{ 
                              color: '#FFFFFF',
                              background: 'rgba(0,0,0,0.2)',
                              padding: '8px',
                              borderRadius: '6px',
                              border: `1px solid ${entryColor}15`
                            }}
                          >
                            {entry.reflection || 'Prompt text not available'}
                          </div>
                        </div>
                        
                        {/* Soul Star */}
                        {entry.soul_star && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="text-xs font-semibold uppercase tracking-wider"
                                  style={{ color: entryColor, textShadow: `0 0 2px ${entryColor}50` }}
                                >
                                  Soul Star
                                </div>
                                {/* Privacy status in expanded view - clickable to toggle */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    sfx.play('click', 0.6);
                                    try {
                                      await updateJournalEntry(entry.id, { is_private: !entry.is_private });
                                    } catch (error) {
                                      console.error('Failed to update privacy:', error);
                                    }
                                  }}
                                  className="text-xs px-2 py-1 rounded-full uppercase font-semibold transition-all hover:opacity-80 cursor-pointer"
                                  style={{
                                    background: entry.is_private ? `${entryColor}15` : 'rgba(34, 197, 94, 0.15)',
                                    color: entry.is_private ? entryColor : '#22C55E',
                                    border: entry.is_private ? `1px solid ${entryColor}40` : '1px solid rgba(34, 197, 94, 0.4)'
                                  }}
                                  title={entry.is_private ? "Make public" : "Make private"}
                                >
                                  {entry.is_private ? 'PRIVATE' : 'PUBLIC'}
                                </button>
                              </div>
                              {!isEditing && (
                                <button
                                  onClick={(e) => handleEditClick(entry, e)}
                                  className="text-xs px-2 py-1 rounded transition-all"
                                  style={{
                                    color: entryColor,
                                    background: `${entryColor}10`,
                                    border: `1px solid ${entryColor}30`
                                  }}
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                            
                            {isEditing ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editResponse}
                                  onChange={(e) => setEditResponse(e.target.value)}
                                  className="w-full h-20 p-2 rounded text-white placeholder-white/50 resize-none focus:outline-none"
                                  style={{
                                    background: 'rgba(0,0,0,0.4)',
                                    border: `1px solid ${entryColor}40`,
                                  }}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSaveEdit(entry.id)}
                                    className="px-3 py-1 text-xs rounded transition-all"
                                    style={{
                                      background: `${entryColor}20`,
                                      color: entryColor,
                                      border: `1px solid ${entryColor}40`
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1 text-xs rounded transition-all"
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.1)',
                                      color: '#FFFFFF',
                                      border: '1px solid rgba(255, 255, 255, 0.3)'
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="text-sm leading-relaxed"
                                style={{ 
                                  color: '#FFFFFF',
                                  background: 'rgba(0,0,0,0.3)',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  border: `1px solid ${entryColor}20`
                                }}
                              >
                                {entry.soul_star}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Today's Journal Interface */
          <div style={{ height: 'auto', maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Date and Element with pending notification */}
            <div className="text-center mb-2">
              <div 
                className="text-base font-semibold mb-1"
                style={{ color: '#FFFFFF' }}
              >
                {todayFormatted}
              </div>
              
              
            </div>

            {/* Intention & Prompt Section */}
            {dailyPrompt && (
              <div className="mb-1 space-y-0.5 -mt-1">
                {/* Intention */}
                <div 
                  className="px-2 py-1 rounded-lg"
                  style={{
                    background: `${elementTheme.color}08`,
                    border: `1px solid ${elementTheme.color}30`,
                    borderLeft: `4px solid ${elementTheme.color}`
                  }}
                >
                  <div 
                    className="text-sm font-semibold mb-1 uppercase tracking-wider"
                    style={{ color: elementTheme.color, textShadow: `0 0 4px ${elementTheme.glow}` }}
                  >
                    Intention
                  </div>
                  <div 
                    className="text-sm leading-relaxed mb-1"
                    style={{ color: '#FFFFFF' }}
                  >
                    {dailyPrompt.intention.text}
                  </div>
                </div>

                {/* Prompt */}
                <div 
                  className="p-2 rounded-lg"
                  style={{
                    background: `${elementTheme.color}08`,
                    border: `1px solid ${elementTheme.color}30`,
                    borderLeft: `4px solid ${elementTheme.color}`
                  }}
                >
                  <div 
                    className="text-sm font-semibold mb-1 uppercase tracking-wider"
                    style={{ color: elementTheme.color, textShadow: `0 0 4px ${elementTheme.glow}` }}
                  >
                    Prompt
                  </div>
                  <div 
                    className="text-sm leading-relaxed"
                    style={{ color: '#FFFFFF' }}
                  >
                    {dailyPrompt.soul_star.text}
                  </div>
                </div>
              </div>
            )}

            {/* Soul Star - Main Journal Entry */}
            <div className="mb-1">
              <textarea
                value={soulStarText}
                onChange={(e) => setSoulStarText(e.target.value)}
                placeholder={(!user?.id || !profile?.element) ? "Let your Soul speak..." : "Let your Soul Star speak…"}
                className="w-full h-16 p-2 rounded-lg text-white placeholder-white/50 resize-none focus:outline-none transition-all"
                disabled={isSaving || journalState.isSubmitted}
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  border: `1px solid ${elementTheme.color}40`,
                  boxShadow: `0 0 10px ${elementTheme.color}20`,
                  opacity: (isSaving || journalState.isSubmitted) ? 0.7 : 1,
                  pointerEvents: (isSaving || journalState.isSubmitted) ? 'none' as any : 'auto'
                }}
                onFocus={(e) => {
                  if (journalState.isSubmitted) return;
                  e.target.style.borderColor = `${elementTheme.color}80`;
                  e.target.style.boxShadow = `0 0 15px ${elementTheme.glow}`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = `${elementTheme.color}40`;
                  e.target.style.boxShadow = `0 0 10px ${elementTheme.color}20`;
                }}
              />
            </div>

            {/* Messages */}
            {(error || journalState.errorMessage) && (
              <div 
                className="mb-1 p-3 rounded-lg text-center text-red-400"
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
                className="mb-1 p-3 rounded-lg text-center"
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

            {/* Bottom Section */}
            <div className="flex justify-center mt-0 mb-0">
              {/* Cast into the Stars Button - centered */}
              {(!user?.id || !profile?.element) ? (
                <button
                  onClick={() => {
                    sfx.play('button', 0.8);
                    if (!hasClickedInitialButton) {
                      // First click - show login text
                      setHasClickedInitialButton(true);
                    } else {
                      // Second click - close journal and open welcome home
                      console.log('🔥 ALIEN profile button clicked!');
                      onClose();
                      if (openWelcomeHome) {
                        console.log('🚀 Calling openWelcomeHome()');
                        openWelcomeHome();
                      } else {
                        console.log('❌ openWelcomeHome not available');
                      }
                    }
                  }}
                  className="px-6 py-1 rounded-lg font-semibold transition-all duration-200"
                  style={{
                    background: hasClickedInitialButton ? '#F2EF1D10' : `${elementTheme.color}30`,
                    border: hasClickedInitialButton ? '2px solid #F2EF1D60' : `2px solid ${elementTheme.color}60`,
                    color: hasClickedInitialButton ? '#F2EF1D' : elementTheme.color,
                    textShadow: hasClickedInitialButton ? '0 0 8px #F2EF1D' : `0 0 8px ${elementTheme.glow}`,
                    boxShadow: hasClickedInitialButton ? '0 0 15px #F2EF1D, 0 0 25px #F2EF1D' : `0 0 15px ${elementTheme.glow}, 0 0 25px ${elementTheme.color}40`
                  }}
                >
                  {!hasClickedInitialButton ? (
                    'CAST YOUR SOUL STAR'
                  ) : (
                    <>
                      Create an{' '}
                      <span
                        className="underline"
                        style={{
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px'
                        }}
                      >
                        ALIEN profile
                      </span>
                      {' '}to submit an entry
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={journalState.isSubmitted ? undefined : handleSaveEntry}
                  disabled={!journalState.isSubmitted && (!soulStarText.trim() || isSaving)}
                  className="px-6 py-1 rounded-lg font-semibold transition-all duration-200"
                  style={{
                    background: (!journalState.isSubmitted && soulStarText.trim() && !isSaving) ? `${elementTheme.color}30` : `${elementTheme.color}10`,
                    border: journalState.isSubmitted ? `2px solid #00FF00` : `2px solid ${elementTheme.color}60`,
                    color: journalState.isSubmitted ? '#00FF00' : elementTheme.color,
                    boxShadow: journalState.isSubmitted
                      ? `0 0 20px #00FF00, 0 0 40px #00FF0040, inset 0 0 10px #00FF0020`
                      : (!journalState.isSubmitted && soulStarText.trim() && !isSaving)
                        ? `0 0 20px ${elementTheme.glow}, 0 0 40px ${elementTheme.color}40, inset 0 0 10px ${elementTheme.color}20`
                        : 'none',
                    textShadow: journalState.isSubmitted ? `0 0 8px #00FF00` : `0 0 4px ${elementTheme.glow}`,
                    pointerEvents: journalState.isSubmitted ? 'none' : 'auto',
                    cursor: journalState.isSubmitted
                      ? 'default'
                      : ((!journalState.isSubmitted && soulStarText.trim() && !isSaving) ? 'pointer' : 'not-allowed')
                  }}
                >
                  {journalState.isSubmitted
                    ? 'Your soul star shines above'
                    : (isSaving ? 'CASTING...' : 'CAST INTO THE STARS')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}