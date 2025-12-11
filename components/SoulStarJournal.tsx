"use client";

import { useState, useEffect, useRef } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import PublicJournalFeed from "@/components/PublicJournalFeed";
import { sfx } from "@/lib/sfx";
import { useDailyReflectionStatus } from "@/hooks/useDailyReflectionStatus";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getLocalDateString, getDisplayDateString } from "@/utils/dateHelpers";
import PopoutShell from "./PopoutShell";
import BinderModal from "./BinderModal";
import BadgesModal from "./BadgesModal";
import UserBadges from "./UserBadges";
import UserCards from "./UserCards";
import Image from 'next/image';

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

interface Profile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

interface JournalEntry {
  entry_id: string;
  entry_date: string;
  created_at: string;
  element: string;
  intention?: string;
  reflection?: string; // prompt question text (was 'prompt')
  intention_response?: string;
  reflection_response?: string;
  soul_star?: string; // user's written reflection text
  is_private?: boolean;
  is_public?: boolean;
  user_id?: string;
  profiles?: Profile | null;
  stars_count?: number;
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
  darkness: "/elements/darkness.webp",
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
  const [activeTab, setActiveTab] = useState<'private' | 'public'>('private');
  const [showCardsModal, setShowCardsModal] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [enlargedBadge, setEnlargedBadge] = useState<any>(null);
  const [showIntegratedBinder, setShowIntegratedBinder] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [publicEntries, setPublicEntries] = useState<JournalEntry[]>([]);
  const [showProfileInfo, setShowProfileInfo] = useState<{[key: string]: boolean}>({});

  const today = getLocalDateString();
  const todayFormatted = getDisplayDateString();

  // Load daily prompt when opened
  useEffect(() => {
    if (isOpen) {
      loadDailyPrompt();
      setShowLoginPrompt(false);
      setHasClickedInitialButton(false);
      // Load public entries when journal opens
      loadPublicEntries();
    }
  }, [isOpen]);

  // Load public entries when switching to PUBLIC tab
  useEffect(() => {
    if (isOpen && activeTab === 'public') {
      loadPublicEntries();
    }
  }, [isOpen, activeTab]);

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
        isPrivate: !(todayEntry.is_public ?? false),
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
        soul_star: soulStarText.trim(),
        is_public: !journalState.isPrivate
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
    setEditingEntry(entry.entry_id);
    setEditResponse(entry.soul_star || "");
  };

  const handleSaveEdit = async (entryId: string) => {
    try {
      sfx.play('click', 0.8);
      await updateJournalEntry(entryId, { soul_star: editResponse.trim() });
      
      // Refresh profile to ensure both private and public views show updated content
      await refreshProfile();
      
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

  const loadPublicEntries = async () => {
    try {
      // For now, let's use the existing journalEntries and filter them on the client side
      // This is a temporary solution to get the PUBLIC tab working
      const publicEntriesFromContext = journalEntries.filter(entry => entry.is_public === true);
      
      // Sort them by date desc, then stars desc
      const sortedPublicEntries = publicEntriesFromContext.sort((a, b) => {
        const dateComparison = new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
        if (dateComparison !== 0) return dateComparison;
        return (b.stars_count ?? 0) - (a.stars_count ?? 0);
      });

      // Add the current user's profile data to each entry for display
      const enrichedEntries = sortedPublicEntries.map(entry => ({
        ...entry,
        profiles: {
          id: profile?.id || '',
          name: profile?.name || 'Anonymous',
          profile_image_url: profile?.profile_image_url || '/elements/alien.webp',
          daily_streak_current: profile?.daily_streak || 0,
          heartcoin_total: profile?.heartcoin_total || 0
        }
      }));

      console.log('Public entries loaded from context:', enrichedEntries.length, enrichedEntries);
      setPublicEntries(enrichedEntries);
    } catch (error) {
      console.error('Error in loadPublicEntries:', error);
    }
  };

  const handleGiveStar = async (entryId: string) => {
    try {
      // Check if user is authenticated
      if (!user?.id) {
        // Open welcome home modal since we don't have openAuthModal
        if (openWelcomeHome) {
          openWelcomeHome();
        }
        return;
      }

      // Call the RPC function
      const { error } = await supabaseBrowser.rpc('give_star_to_journal_entry', {
        p_entry_id: entryId,
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error giving star:', error);
        return;
      }

      // Refresh both profile and public entries to update the counts
      await Promise.all([
        refreshProfile(),
        loadPublicEntries()
      ]);
      
    } catch (error) {
      console.error('Failed to give star:', error);
    }
  };

  // Helper function to get element icon path
  const getElementIcon = (element: string | null) => {
    const iconMap: Record<string, string> = {
      'heart': '/elements/heart.webp',
      'water': '/elements/water.webp', 
      'lightning': '/elements/lightning.webp',
      'darkness': '/elements/darkness.webp'
    };
    return iconMap[element || ''] || '/elements/elementals.webp';
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
      className="fixed inset-0 z-[2147483646] flex items-start justify-center"
      style={{ 
        paddingTop: '8vh',
        paddingBottom: '20px',
        paddingLeft: '20px',
        paddingRight: '20px'
      }}
    >

      {/* Holographic base glow */}
      <div 
        className="absolute"
        style={{
          width: 'min(800px, 100%)',
          height: '250px',
          top: 'calc(8vh + 200px)',
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
          width: 'min(600px, 90%)',
          height: '200px',
          top: 'calc(8vh + 200px)',
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
        /* Full Log View - Public or Private based on activeTab */
        <div 
          className="w-full max-w-4xl mx-auto"
          style={{ 
            height: '400px', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column',
            background: 'rgba(0, 0, 0, 0.7)',
            border: `1px solid ${elementTheme.color}60`,
            boxShadow: `0 0 30px ${elementTheme.color}60, 0 0 60px ${elementTheme.color}40, 0 0 100px ${elementTheme.color}20`,
            borderRadius: '14px',
            backdropFilter: 'blur(8px)'
          }}
        >
          {/* Title Section with FULL LOG button and title */}
          <div className="text-center mb-0.5 relative">
            {/* Full Log Button - Left of Title */}
            <button
              onClick={() => {
                try { sfx.play('click', 0.8); } catch {}
                setShowHistory(!showHistory);
              }}
              onMouseEnter={() => {
                try { sfx.play('hover', 0.6); } catch {}
              }}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm font-semibold transition-all duration-200 hover:opacity-100 hover:scale-105 px-3 py-1.5 rounded z-20"
              style={{
                color: '#00FFFF',
                textShadow: `0 0 8px #00FFFF, 0 0 15px #00FFFF, 0 0 25px #00FFFF`,
                opacity: 1,
                background: '#00FFFF30',
                border: `2px solid #00FFFF`,
                boxShadow: `0 0 15px #00FFFF, 0 0 30px #00FFFF60`,
                cursor: 'pointer',
                pointerEvents: 'auto',
                zIndex: 20
              }}
            >
              {showHistory ? 'TODAY' : 'FULL LOG'}
            </button>

            {/* Close Button - Right of Title */}
            <button 
              onClick={handleClose}
              onMouseEnter={() => {
                try { sfx.play('hover', 0.6); } catch {}
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 z-20"
              style={{
                background: 'rgba(0, 0, 0, 0.8)',
                border: `2px solid ${elementTheme.color}`,
                boxShadow: `0 0 15px ${elementTheme.color}, 0 0 30px ${elementTheme.color}60`,
                fontSize: '20px',
                color: elementTheme.color,
                textShadow: `0 0 8px ${elementTheme.color}, 0 0 15px ${elementTheme.color}`
              }}
              aria-label="Close journal"
            >
              ×
            </button>

            {/* SOUL STAR JOURNAL Title */}
            <div 
              className="text-lg font-bold tracking-wider mt-0.5 mb-4"
              style={{
                color: elementTheme.color,
                textShadow: `0 0 15px ${elementTheme.glow}, 0 0 30px ${elementTheme.glow}`,
                filter: `drop-shadow(0 0 8px ${elementTheme.color})`
              }}
            >
              SOUL STAR JOURNAL
            </div>
            
            {/* Element-colored line below title */}
            <div 
              className="mx-auto"
              style={{
                width: 'min(300px, 90%)',
                height: '2px',
                background: elementTheme.color,
                boxShadow: `0 0 8px ${elementTheme.color}, 0 0 15px ${elementTheme.glow}`
              }}
            />
          </div>

          {/* Tabs Switcher - below yellow line, Public left, Private right */}
          <div className="flex items-center justify-center gap-4 px-3 py-1 border-b border-white/20">
            <button
              onClick={() => {
                try { sfx.play('change-channel', 0.8); } catch {}
                setActiveTab('public');
              }}
              onMouseEnter={() => {
                try { sfx.play('hover', 0.6); } catch {}
              }}
              className="px-4 py-1.5 rounded-full text-sm font-semibold uppercase transition-all duration-200 hover:scale-105"
              style={{
                background: activeTab === 'public' ? '#00FF0030' : 'rgba(0,0,0,0.4)',
                color: activeTab === 'public' ? '#00FF00' : '#FFFFFFCC',
                border: `2px solid ${activeTab === 'public' ? '#00FF00' : '#FFFFFF40'}`,
                boxShadow: activeTab === 'public' ? '0 0 15px #00FF0060, 0 0 25px #00FF0040' : 'none',
                textShadow: activeTab === 'public' ? '0 0 8px #00FF00, 0 0 15px #00FF00' : 'none'
              }}
            >
              PUBLIC
            </button>
            <button
              onClick={() => {
                try { sfx.play('change-channel', 0.8); } catch {}
                setActiveTab('private');
              }}
              onMouseEnter={() => {
                try { sfx.play('hover', 0.6); } catch {}
              }}
              className="px-4 py-1.5 rounded-full text-sm font-semibold uppercase transition-all duration-200 hover:scale-105"
              style={{
                background: activeTab === 'private' ? '#FF69B430' : 'rgba(0,0,0,0.4)',
                color: activeTab === 'private' ? '#FF69B4' : '#FFFFFFCC',
                border: `2px solid ${activeTab === 'private' ? '#FF69B4' : '#FFFFFF40'}`,
                boxShadow: activeTab === 'private' ? '0 0 15px #FF69B460, 0 0 25px #FF69B440' : 'none',
                textShadow: activeTab === 'private' ? '0 0 8px #FF69B4, 0 0 15px #FF69B4' : 'none'
              }}
            >
              PRIVATE
            </button>
          </div>

          {/* Scrollable entries container for both PUBLIC and PRIVATE tabs */}
          <div className="journal-scroll mt-3 space-y-3 max-h-[60vh] overflow-y-auto pr-1 px-4">
            {activeTab === 'private' ? (
              <div className="space-y-4">
                {journalEntries
                  .filter(entry => true) // Show all entries in private tab
                  .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
                  .map((entry) => {
                    const entryElement = entry.element as keyof typeof ELEMENT_COLORS;
                    const entryTheme = ELEMENT_COLORS[entryElement] || ELEMENT_COLORS.heart;
                    const entryEmoji = ELEMENT_EMOJIS[entryElement] || "💖";
                    const isEditing = editingEntry === entry.entry_id;
                    
                    const isExpanded = expandedEntry === entry.entry_id;
                    
                    return (
                      <div
                        key={entry.entry_id}
                        onClick={() => handleEntryClick(entry.entry_id)}
                        onMouseEnter={() => {
                          try { sfx.play('hover', 0.6); } catch {}
                        }}
                        className="rounded-lg p-2 space-y-2 cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-105"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: `1px solid ${entryTheme.color}40`,
                          boxShadow: `0 0 15px ${entryTheme.color}20`
                        }}
                      >
                        {/* Header with Date, Element, and Privacy Toggle */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-semibold text-white/90">{getDisplayDateString(entry.entry_date)}</div>
                            <div 
                              className="px-2 py-1 rounded text-xs font-semibold uppercase flex items-center gap-1"
                              style={{
                                background: `${entryTheme.color}20`,
                                color: entryTheme.color,
                                border: `1px solid ${entryTheme.color}40`,
                                textShadow: `0 0 4px ${entryTheme.glow}`
                              }}
                            >
                              {entry.element?.toUpperCase()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try { sfx.play('change-channel', 0.8); } catch {}
                                const currentIsPrivate = !(entry.is_public ?? false);
                                updateJournalEntry(entry.entry_id, { is_public: currentIsPrivate });
                              }}
                              onMouseEnter={() => {
                                try { sfx.play('hover', 0.6); } catch {}
                              }}
                              className="px-2 py-1 rounded text-xs font-semibold transition-all"
                              style={{
                                background: !(entry.is_public ?? false) ? '#FF69B420' : `${entryTheme.color}20`,
                                border: `1px solid ${!(entry.is_public ?? false) ? '#FF69B460' : entryTheme.color + '60'}`,
                                color: !(entry.is_public ?? false) ? '#FF69B4' : entryTheme.color,
                                textShadow: !(entry.is_public ?? false) ? '0 0 4px #FF69B4' : `0 0 4px ${entryTheme.glow}`
                              }}
                            >
                              {!(entry.is_public ?? false) ? 'PRIVATE' : 'PUBLIC'}
                            </button>
                          </div>
                        </div>

                        {/* Expanded content - only show when expanded */}
                        {isExpanded && (
                          <>
                            {/* Intention Section */}
                            {entry.intention && (
                          <div 
                            className="rounded-lg px-3 py-2 mb-2"
                            style={{
                              background: 'rgba(0, 0, 0, 0.3)',
                              border: `1px solid ${entryTheme.color}30`,
                              boxShadow: `0 0 8px ${entryTheme.color}10`
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <svg 
                                width="14" 
                                height="14" 
                                viewBox="0 0 24 24" 
                                fill="none"
                                style={{
                                  filter: `drop-shadow(0 0 4px ${entryTheme.color})`
                                }}
                              >
                                <circle cx="12" cy="12" r="9" fill="none" stroke={entryTheme.color} strokeWidth="2" strokeDasharray="3 3"/>
                                <circle cx="12" cy="12" r="3" fill={entryTheme.color}/>
                                <path d="M12 3v6m0 6v6m-9-9h6m6 0h6" stroke={entryTheme.color} strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                              <div 
                                className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: entryTheme.color, textShadow: `0 0 4px ${entryTheme.glow}` }}
                              >
                                Intention
                              </div>
                            </div>
                            <div className="text-xs leading-relaxed text-white/90">{entry.intention}</div>
                          </div>
                        )}

                        {/* Prompt Section */}
                        <div 
                          className="rounded-lg px-3 py-2 mb-2"
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: `1px solid ${entryTheme.color}30`,
                            boxShadow: `0 0 8px ${entryTheme.color}10`
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <svg 
                              width="14" 
                              height="14" 
                              viewBox="0 0 24 24" 
                              fill="none"
                              style={{
                                filter: `drop-shadow(0 0 4px ${entryTheme.color})`
                              }}
                            >
                              <path d="M8 9h8M8 12h8M8 15h6" stroke={entryTheme.color} strokeWidth="2" strokeLinecap="round"/>
                              <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke={entryTheme.color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="19" cy="8" r="2" fill={entryTheme.color} opacity="0.8"/>
                            </svg>
                            <div 
                              className="text-xs font-semibold uppercase tracking-wider"
                              style={{ color: entryTheme.color, textShadow: `0 0 4px ${entryTheme.glow}` }}
                            >
                              Prompt
                            </div>
                          </div>
                          <div className="text-xs leading-relaxed text-white/90">{entry.reflection || "No prompt available"}</div>
                        </div>

                        {/* Soul Star Section with Edit Functionality */}
                        <div 
                          className="rounded-lg px-3 py-2"
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: `1px solid ${entryTheme.color}60`,
                            boxShadow: `0 0 12px ${entryTheme.color}20`
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none"
                                style={{
                                  filter: `drop-shadow(0 0 4px ${entryTheme.color})`
                                }}
                              >
                                <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" fill={entryTheme.color} stroke={entryTheme.color} strokeWidth="0.5"/>
                                <circle cx="12" cy="12" r="8" fill="none" stroke={entryTheme.color} strokeWidth="1" opacity="0.6"/>
                              </svg>
                              <div 
                                className="text-sm font-semibold uppercase tracking-wider"
                                style={{ color: entryTheme.color, textShadow: `0 0 4px ${entryTheme.glow}` }}
                              >
                                Soul Star
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {!isEditing ? (
                                <button
                                  onClick={(e) => handleEditClick(entry, e)}
                                  className="text-xs px-2 py-1 rounded hover:opacity-80 transition-all"
                                  style={{
                                    background: `${entryTheme.color}20`,
                                    color: entryTheme.color,
                                    border: `1px solid ${entryTheme.color}40`
                                  }}
                                >
                                  Edit
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(entry.entry_id)}
                                    className="text-xs px-2 py-1 rounded hover:opacity-80 transition-all"
                                    style={{
                                      background: '#22C55E20',
                                      color: '#22C55E',
                                      border: '1px solid #22C55E40'
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-xs px-2 py-1 rounded hover:opacity-80 transition-all"
                                    style={{
                                      background: '#EF444420',
                                      color: '#EF4444',
                                      border: '1px solid #EF444440'
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {isEditing ? (
                            <textarea
                              value={editResponse}
                              onChange={(e) => setEditResponse(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full h-20 p-2 rounded text-white placeholder-white/50 resize-none focus:outline-none"
                              style={{
                                background: 'rgba(0,0,0,0.4)',
                                border: `1px solid ${entryTheme.color}30`,
                                boxShadow: `0 0 8px ${entryTheme.color}15`
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = `${entryTheme.color}60`;
                                e.target.style.boxShadow = `0 0 15px ${entryTheme.glow}`;
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = `${entryTheme.color}30`;
                                e.target.style.boxShadow = `0 0 8px ${entryTheme.color}15`;
                              }}
                            />
                          ) : (
                            <div className="text-sm leading-relaxed text-white">
                              {entry.soul_star || "No soul star response"}
                            </div>
                          )}
                        </div>
                          </>
                        )}
                      </div>
                    );
                  })
                }
                {journalEntries.length === 0 && (
                  <div className="text-center p-8 text-white/60">
                    <div className="text-lg mb-2">📝 No Journal Entries</div>
                    <div className="text-sm opacity-80">Your journal entries will appear here</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {publicEntries
                  .map((entry) => {
                    const entryElement = entry.element as keyof typeof ELEMENT_COLORS;
                    const entryTheme = ELEMENT_COLORS[entryElement] || ELEMENT_COLORS.heart;
                    const entryEmoji = ELEMENT_EMOJIS[entryElement] || "💖";
                    const isEditing = editingEntry === entry.entry_id;
                    
                    const isExpanded = expandedEntry === entry.entry_id;
                    
                    return (
                      <div
                        key={entry.entry_id}
                        className="rounded-lg p-2 space-y-2 transition-all duration-200 hover:opacity-90"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: `1px solid ${entryTheme.color}40`,
                          boxShadow: `0 0 15px ${entryTheme.color}20`
                        }}
                      >
                        {/* Header with Profile (left), Date (center), Element + Soul Star (right) */}
                        <div className="flex items-center justify-between mb-2 relative">
                          {/* Profile Info - Left */}
                          <div 
                            className="flex items-center gap-2 cursor-pointer transition-all duration-200 hover:opacity-80 hover:scale-105"
                            onClick={(e) => {
                              e.stopPropagation();
                              try { sfx.play('click', 0.6); } catch {}
                              setShowProfileInfo(prev => ({
                                ...prev,
                                [entry.entry_id]: !prev[entry.entry_id]
                              }));
                            }}
                            onMouseEnter={() => {
                              try { sfx.play('hover', 0.6); } catch {}
                            }}
                          >
                            <img 
                              src={entry.profiles?.profile_image_url || "/elements/alien.webp"} 
                              alt="User" 
                              className="w-8 h-8 rounded-full object-cover"
                              style={{
                                border: `1px solid ${entryTheme.color}60`,
                                boxShadow: `0 0 4px ${entryTheme.color}30`
                              }}
                            />
                            <div className="text-sm font-medium text-white/80">
                              {entry.profiles?.name || 'Anonymous'}
                            </div>
                          </div>
                          
                          {/* Date - Center */}
                          <div className="text-sm font-semibold text-white/90 absolute left-1/2 transform -translate-x-1/2">
                            {getDisplayDateString(entry.entry_date)}
                          </div>
                          
                          {/* Element + Soul Star - Right */}
                          <div className="flex items-center gap-2">
                            <div 
                              className="px-2 py-1 rounded text-xs font-semibold uppercase flex items-center gap-1"
                              style={{
                                background: `${entryTheme.color}20`,
                                color: entryTheme.color,
                                border: `1px solid ${entryTheme.color}40`,
                                textShadow: `0 0 4px ${entryTheme.glow}`
                              }}
                            >
                              {entry.element?.toUpperCase()}
                            </div>
                            {/* Soul Star Button */}
                            <button
                              type="button"
                              className="flex items-center gap-1 transition-all duration-200 hover:scale-105 px-2 py-1 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                sfx.play('click', 0.6);
                                handleGiveStar(entry.entry_id);
                              }}
                              onMouseEnter={() => {
                                try { sfx.play('hover', 0.6); } catch {}
                              }}
                              style={{
                                background: 'rgba(0, 0, 0, 0.6)',
                                border: `1px solid ${entryTheme.color}60`,
                                boxShadow: `0 0 8px ${entryTheme.color}30`
                              }}
                            >
                              <Image
                                src="/elements/soul-star.webp"
                                alt="Soul Star"
                                width={16}
                                height={16}
                                style={{
                                  filter: `drop-shadow(0 0 4px ${entryTheme.color})`
                                }}
                              />
                              <span 
                                className="text-xs font-medium"
                                style={{ 
                                  color: entryTheme.color,
                                  textShadow: `0 0 4px ${entryTheme.glow}`
                                }}
                              >
                                {entry.stars_count ?? 0}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Soul Star Preview - Always visible in public view */}
                        <div 
                          className="rounded-lg px-3 py-2 mb-2"
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: `1px solid ${entryTheme.color}60`,
                            boxShadow: `0 0 12px ${entryTheme.color}20`
                          }}
                        >
                          {showProfileInfo[entry.entry_id] ? (
                            <>
                              
                              {/* Profile Info Layout */}
                              <div className="flex items-start gap-3 mb-3">
                                <img 
                                  src={entry.profiles?.profile_image_url || "/elements/alien.webp"} 
                                  alt="User" 
                                  className="w-12 h-12 rounded-full object-cover"
                                  style={{
                                    border: `2px solid ${entryTheme.color}60`,
                                    boxShadow: `0 0 8px ${entryTheme.color}30`
                                  }}
                                />
                                <div className="flex-1">
                                  <div className="mb-2">
                                    <div className="flex items-center">
                                      <div className="text-lg font-semibold text-white">
                                        {entry.profiles?.name || 'Anonymous'}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Action buttons and element badge row */}
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          try { sfx.play('click', 0.4); } catch {}
                                          setShowIntegratedBinder(!showIntegratedBinder);
                                        }}
                                        onMouseEnter={() => {
                                          try { sfx.play('hover', 0.6); } catch {}
                                        }}
                                        className="w-10 h-10 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center"
                                        style={{
                                          background: 'transparent',
                                          color: '#00BFFF',
                                          textShadow: '0 0 4px #00BFFF'
                                        }}
                                      >
                                        <img 
                                          src="/elements/binder.webp" 
                                          alt="Binder" 
                                          className="w-7 h-7"
                                        />
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          try { sfx.play('click', 0.4); } catch {}
                                          setShowBadgesModal(!showBadgesModal);
                                        }}
                                        onMouseEnter={() => {
                                          try { sfx.play('hover', 0.6); } catch {}
                                        }}
                                        className="w-10 h-10 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center"
                                        style={{
                                          background: 'transparent',
                                          color: '#FF69B4',
                                          textShadow: '0 0 4px #FF69B4'
                                        }}
                                      >
                                        <img 
                                          src="/elements/badges.webp" 
                                          alt="Badges" 
                                          className="w-7 h-7"
                                        />
                                      </button>
                                    </div>
                                    
                                    {/* Element badge centered between buttons and stats */}
                                    <div className="flex-1 flex justify-center">
                                      <div 
                                        className="text-sm font-medium uppercase tracking-wider flex items-center gap-1 px-2 py-1 rounded-full"
                                        style={{ 
                                          color: entryTheme.color,
                                          background: `${entryTheme.color}20`,
                                          border: `1px solid ${entryTheme.color}40`
                                        }}
                                      >
                                        {entry.element?.toUpperCase() || 'Unknown Element'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Stats positioned at the very right */}
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-1 bg-black/30 rounded-full px-2 py-1">
                                    <span className="text-xs text-white/60">Total:</span>
                                    <img 
                                      src="/elements/heart-coin.webp" 
                                      alt="Heart Coin" 
                                      className="w-4 h-4"
                                    />
                                    <span 
                                      className="font-bold text-xs"
                                      style={{
                                        color: '#FF69B4',
                                        textShadow: '0 0 6px #FF69B4'
                                      }}
                                    >
                                      {entry.profiles?.heartcoin_total || 0}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 bg-black/30 rounded-full px-2 py-1">
                                    <span 
                                      className="font-bold text-xs"
                                      style={{
                                        color: '#FF69B4',
                                        textShadow: '0 0 6px #FF69B4'
                                      }}
                                    >
                                      Streak: {entry.profiles?.daily_streak || 0} Days
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Integrated Binder Display - Show when BINDER is clicked */}
                              {showIntegratedBinder && (
                                <div 
                                  className="rounded-lg px-3 py-2 mb-2"
                                  style={{
                                    background: 'rgba(255, 105, 180, 0.1)',
                                    border: `1px solid #FF69B430`,
                                    boxShadow: `0 0 8px #FF69B420`
                                  }}
                                >
                                  <UserCards
                                    userId={entry.user_id}
                                    embedded={true}
                                    showTitle={true}
                                    maxCards={4}
                                  />
                                </div>
                              )}

                              {/* Integrated Badges Display - Show when BADGES is clicked */}
                              {showBadgesModal && (
                                <div 
                                  className="rounded-lg px-3 py-2 mb-2"
                                  style={{
                                    background: 'rgba(0, 255, 255, 0.1)',
                                    border: `1px solid #00FFFF30`,
                                    boxShadow: `0 0 8px #00FFFF20`
                                  }}
                                >
                                  <UserBadges
                                    userId={entry.user_id}
                                    embedded={true}
                                    showTitle={true}
                                    maxBadges={5}
                                    onBadgeClick={(badge) => {
                                      setEnlargedBadge(badge);
                                      setShowBadgesModal(true);
                                    }}
                                  />
                                </div>
                              )}

                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <svg 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill="none"
                                  style={{
                                    filter: `drop-shadow(0 0 4px ${entryTheme.color})`
                                  }}
                                >
                                  <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" fill={entryTheme.color} stroke={entryTheme.color} strokeWidth="0.5"/>
                                  <circle cx="12" cy="12" r="8" fill="none" stroke={entryTheme.color} strokeWidth="1" opacity="0.6"/>
                                </svg>
                                <div 
                                  className="text-sm font-semibold uppercase tracking-wider"
                                  style={{ color: entryTheme.color, textShadow: `0 0 4px ${entryTheme.glow}` }}
                                >
                                  Soul Star
                                </div>
                              </div>
                              <div className="text-sm leading-relaxed text-white">
                                {entry.soul_star || "No soul star response"}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Expanded content - only show when expanded */}
                        {isExpanded && (
                          <>
                            {/* Profile Information Section */}
                            <div 
                              className="rounded-lg px-3 py-2 mb-2"
                              style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: `1px solid ${entryTheme.color}30`,
                                boxShadow: `0 0 8px ${entryTheme.color}10`
                              }}
                            >
                              {/* Daily Streak and Heart Coins - Two columns */}
                              <div className="flex gap-4 mb-3">
                                <div className="flex-1 flex items-center gap-2 bg-black/30 rounded-full px-3 py-1">
                                  <span className="text-xs text-white/80">Daily Streak:</span>
                                  <span 
                                    className="font-bold text-sm"
                                    style={{
                                      color: '#00FFFF',
                                      textShadow: '0 0 6px #00FFFF'
                                    }}
                                  >
                                    {entry.profiles?.daily_streak_current || 0} days
                                  </span>
                                </div>
                                <div className="flex-1 flex items-center gap-2 bg-black/30 rounded-full px-3 py-1">
                                  <span className="text-xs text-white/60">Total:</span>
                                  <img 
                                    src="/elements/heart-coin.webp" 
                                    alt="Heart Coin" 
                                    className="w-4 h-4"
                                  />
                                  <span 
                                    className="font-bold text-sm"
                                    style={{
                                      color: '#FF69B4',
                                      textShadow: '0 0 6px #FF69B4'
                                    }}
                                  >
                                    {entry.profiles?.heartcoin_total || 0}
                                  </span>
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex gap-2">
                                {/* Binder button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    try { sfx.play('click', 0.4); } catch {}
                                    setShowIntegratedBinder(!showIntegratedBinder);
                                  }}
                                  className="flex-1 w-10 h-10 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center"
                                  style={{
                                    background: 'transparent',
                                                                        color: '#00BFFF',
                                    textShadow: '0 0 4px #00BFFF'
                                  }}
                                >
                                  <img 
                                    src="/elements/binder.webp" 
                                    alt="Binder" 
                                    className="w-6 h-6"
                                  />
                                </button>

                                {/* Badges button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    try { sfx.play('click', 0.4); } catch {}
                                    setShowBadgesModal(!showBadgesModal);
                                  }}
                                  onMouseEnter={() => {
                                    try { sfx.play('hover', 0.6); } catch {}
                                  }}
                                  className="flex-1 w-10 h-10 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center"
                                  style={{
                                    background: 'transparent',
                                                                        color: '#FF69B4',
                                    textShadow: '0 0 4px #FF69B4'
                                  }}
                                >
                                  <img 
                                    src="/elements/badges.webp" 
                                    alt="Badges" 
                                    className="w-5 h-5"
                                  />
                                </button>
                              </div>
                            </div>


                        {/* Soul Star Section with Edit Functionality */}
                        <div 
                          className="rounded-lg px-3 py-2"
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: `1px solid ${entryTheme.color}60`,
                            boxShadow: `0 0 12px ${entryTheme.color}20`
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none"
                                style={{
                                  filter: `drop-shadow(0 0 4px ${entryTheme.color})`
                                }}
                              >
                                <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" fill={entryTheme.color} stroke={entryTheme.color} strokeWidth="0.5"/>
                                <circle cx="12" cy="12" r="8" fill="none" stroke={entryTheme.color} strokeWidth="1" opacity="0.6"/>
                              </svg>
                              <div 
                                className="text-sm font-semibold uppercase tracking-wider"
                                style={{ color: entryTheme.color, textShadow: `0 0 4px ${entryTheme.glow}` }}
                              >
                                Soul Star
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {!isEditing ? (
                                <button
                                  onClick={(e) => handleEditClick(entry, e)}
                                  className="text-xs px-2 py-1 rounded hover:opacity-80 transition-all"
                                  style={{
                                    background: `${entryTheme.color}20`,
                                    color: entryTheme.color,
                                    border: `1px solid ${entryTheme.color}40`
                                  }}
                                >
                                  Edit
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(entry.entry_id)}
                                    className="text-xs px-2 py-1 rounded hover:opacity-80 transition-all"
                                    style={{
                                      background: '#22C55E20',
                                      color: '#22C55E',
                                      border: '1px solid #22C55E40'
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-xs px-2 py-1 rounded hover:opacity-80 transition-all"
                                    style={{
                                      background: '#EF444420',
                                      color: '#EF4444',
                                      border: '1px solid #EF444440'
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {isEditing ? (
                            <textarea
                              value={editResponse}
                              onChange={(e) => setEditResponse(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full h-20 p-2 rounded text-white placeholder-white/50 resize-none focus:outline-none"
                              style={{
                                background: 'rgba(0,0,0,0.4)',
                                border: `1px solid ${entryTheme.color}30`,
                                boxShadow: `0 0 8px ${entryTheme.color}15`
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = `${entryTheme.color}60`;
                                e.target.style.boxShadow = `0 0 15px ${entryTheme.glow}`;
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = `${entryTheme.color}30`;
                                e.target.style.boxShadow = `0 0 8px ${entryTheme.color}15`;
                              }}
                            />
                          ) : (
                            <div className="text-sm leading-relaxed text-white">
                              {entry.soul_star || "No soul star response"}
                            </div>
                          )}
                        </div>
                          </>
                        )}
                      </div>
                    );
                  })
                }
                {publicEntries.length === 0 && (
                  <div className="text-center p-8 text-white/60">
                    <div className="text-lg mb-2">🌍 No Public Journal Entries</div>
                    <div className="text-sm opacity-80">Public journal entries will appear here</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Today's Journal Interface */
        <div 
          className="w-full max-w-4xl mx-auto"
          style={{ 
            height: '400px', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column',
            background: 'rgba(0, 0, 0, 0.7)',
            border: `1px solid ${elementTheme.color}60`,
            boxShadow: `0 0 30px ${elementTheme.color}60, 0 0 60px ${elementTheme.color}40, 0 0 100px ${elementTheme.color}20`,
            borderRadius: '14px',
            backdropFilter: 'blur(8px)'
          }}
        >
          {/* Main Entry Card Container */}
          <div 
            className="rounded-lg px-1 pt-2 pb-1.5 space-y-3"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              border: `1px solid ${elementTheme.color}60`,
              boxShadow: `0 0 30px ${elementTheme.color}60, 0 0 60px ${elementTheme.color}40, 0 0 100px ${elementTheme.color}20`,
              borderRadius: '12px'
            }}
          >
            {/* Title Section */}
              <div className="text-center mb-1 relative">
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
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm font-semibold transition-all duration-200 hover:opacity-100 px-3 py-1.5 rounded z-20"
                style={{
                  color: '#00FFFF',
                  textShadow: `0 0 8px #00FFFF, 0 0 15px #00FFFF, 0 0 25px #00FFFF`,
                  opacity: 1,
                  background: '#00FFFF30',
                  border: `1px solid #00FFFF`,
                  boxShadow: `0 0 15px #00FFFF, 0 0 30px #00FFFF60`,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  zIndex: 20
                }}
              >
                {showHistory ? 'TODAY' : 'FULL LOG'}
              </button>

              {/* Close Button - Right of Title */}
              <button 
                onClick={handleClose}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 z-20"
                style={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  border: `2px solid ${elementTheme.color}`,
                  boxShadow: `0 0 15px ${elementTheme.color}, 0 0 30px ${elementTheme.color}60`,
                  fontSize: '20px',
                  color: elementTheme.color,
                  textShadow: `0 0 8px ${elementTheme.color}, 0 0 15px ${elementTheme.color}`
                }}
                aria-label="Close journal"
              >
                ×
              </button>

              {/* SOUL STAR JOURNAL Title */}
              <div 
                className="text-lg font-bold tracking-wider mt-0.5 mb-4"
                style={{
                  color: elementTheme.color,
                  textShadow: `0 0 15px ${elementTheme.glow}, 0 0 30px ${elementTheme.glow}`,
                  filter: `drop-shadow(0 0 8px ${elementTheme.color})`
                }}
              >
                SOUL STAR JOURNAL
              </div>
              
              {/* Element-colored line below title */}
              <div 
                className="mx-auto"
                style={{
                  width: 'min(300px, 90%)',
                  height: '2px',
                  background: elementTheme.color,
                  boxShadow: `0 0 8px ${elementTheme.color}, 0 0 15px ${elementTheme.glow}`
                }}
              />
            </div>


            {/* Header Layout - Date and Element */}
            <div className="relative pb-5">
              {/* Date - Top Center */}
              <div 
                className="absolute top-0 left-1/2 transform -translate-x-1/2 text-lg font-semibold"
                style={{ 
                  color: 'rgba(255, 255, 255, 0.9)',
                  textShadow: `1px 1px 3px rgba(0, 0, 0, 0.7), 0 0 10px rgba(0, 0, 0, 0.5)`,
                  filter: `drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.8))`
                }}
              >
                {getDisplayDateString(dailyPrompt.prompt_date)}
              </div>

              {/* Privacy Toggle - Top Right */}
              <button
                className="privacy-toggle-button"
                onClick={async () => {
                  console.log('Privacy button clicked!', journalState.isPrivate);
                  try {
                    sfx.play('change-channel', 0.8);
                  } catch (e) {
                    console.log('SFX not available');
                  }
                  
                  const newPrivacySetting = !journalState.isPrivate;
                  setJournalState(prev => ({ ...prev, isPrivate: newPrivacySetting }));
                  
                  // If entry is already submitted, update it in the database
                  if (journalState.isSubmitted && journalEntries && dailyPrompt) {
                    const todayEntry = journalEntries.find(entry => 
                      entry.entry_date === today && entry.element === dailyPrompt.element
                    );
                    if (todayEntry) {
                      try {
                        await updateJournalEntry(todayEntry.entry_id, { is_public: !newPrivacySetting });
                      } catch (error) {
                        console.error('Failed to update privacy setting:', error);
                        // Revert the state if update failed
                        setJournalState(prev => ({ ...prev, isPrivate: !newPrivacySetting }));
                      }
                    }
                  }
                }}
                className="absolute top-0 right-0 px-3 py-1 rounded text-xs font-semibold transition-all duration-200 z-10"
                style={{
                  background: journalState.isPrivate ? '#FF69B420' : '#00FF0020',
                  border: `2px solid ${journalState.isPrivate ? '#FF69B4' : '#00FF00'}`,
                  color: journalState.isPrivate ? '#FF69B4' : '#00FF00',
                  textShadow: journalState.isPrivate ? '0 0 4px #FF69B4' : '0 0 8px #00FF00, 0 0 15px #00FF00',
                  cursor: 'pointer',
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
                  border: dailyPrompt?.element === 'darkness' 
                    ? '2px solid #FFFFFF' 
                    : `1px solid ${elementTheme.color}60`,
                  textShadow: `0 0 4px ${elementTheme.glow}`
                }}
              >
                <img 
                  src={getElementIcon(dailyPrompt?.element || null)} 
                  alt={dailyPrompt?.element || 'element'} 
                  className="w-4 h-4"
                />
                {dailyPrompt?.element?.toUpperCase()}
              </div>
            </div>

            {/* Section Cards */}
            {dailyPrompt && (
              <div className="space-y-0 mt-2">
                {/* Intention Card */}
                <div 
                  className="rounded-lg px-1 pt-0.5 pb-1 -mx-1"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `1px solid ${elementTheme.color}60`,
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
                    border: `1px solid ${elementTheme.color}60`,
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
                    border: `1px solid ${elementTheme.color}60`,
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
                      onClick={(e) => e.stopPropagation()}
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
                <div className="flex gap-3 pt-0">
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
                        background: hasClickedInitialButton 
                          ? 'rgba(255, 255, 0, 0.15)' 
                          : `linear-gradient(135deg, ${elementTheme.color}60, ${elementTheme.color}80)`,
                        color: hasClickedInitialButton ? '#FFFF00' : '#000000',
                        border: hasClickedInitialButton 
                          ? '2px solid #FFFF00' 
                          : `1px solid ${elementTheme.color}`,
                        boxShadow: hasClickedInitialButton 
                          ? '0 0 20px #FFFF00, 0 0 40px #FFFF0060, inset 0 0 15px #FFFF0030' 
                          : `0 0 20px ${elementTheme.color}40, inset 0 0 10px ${elementTheme.color}20`,
                        textShadow: hasClickedInitialButton 
                          ? '0 0 8px #FFFF00, 0 0 15px #FFFF00, 0 0 25px #FFFF00' 
                          : 'none'
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
                          ? 'rgba(57, 255, 20, 0.2)' 
                          : `linear-gradient(135deg, ${elementTheme.color}60, ${elementTheme.color}80)`,
                        color: journalState.isSubmitted ? '#39FF14' : '#000000',
                        border: journalState.isSubmitted 
                          ? '2px solid #39FF14' 
                          : `1px solid ${elementTheme.color}`,
                        boxShadow: journalState.isSubmitted 
                          ? '0 0 20px #39FF14, 0 0 40px #39FF1460, inset 0 0 15px #39FF1430' 
                          : `0 0 20px ${elementTheme.color}40, inset 0 0 10px ${elementTheme.color}20`,
                        textShadow: journalState.isSubmitted 
                          ? '0 0 8px #39FF14, 0 0 15px #39FF14, 0 0 25px #39FF14' 
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


      {/* Cards Modal - opened from journal profile section */}
      {showCardsModal && (
        <BinderModal 
          open={showCardsModal}
          onClose={() => setShowCardsModal(false)}
          pulsingCards={true}
        />
      )}

      {/* Card Popup Modal */}
      {selectedCard && (
        <div 
          className="fixed inset-0 z-[2147483645] flex items-center justify-center p-4 pointer-events-none"
          onClick={() => {
            setSelectedCard(null);
            setIsCardFlipped(false);
          }}
        >
          <div 
            className="relative preserve-3d cursor-pointer pointer-events-auto"
            style={{
              width: '160px',
              height: '224px',
              transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              try { sfx.play('click', 0.8); } catch {}
              setIsCardFlipped(!isCardFlipped);
            }}
          >
            {/* Card Front */}
            <div
              className="absolute inset-0 rounded-xl overflow-hidden backface-hidden"
              style={{
                backfaceVisibility: 'hidden',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                border: '3px solid #00BFFF',
                boxShadow: '0 0 30px #00BFFF60, 0 0 60px #00BFFF40',
                animation: 'cardPulse 2s ease-in-out infinite'
              }}
            >
              <img
                src={`/cards/${selectedCard.card_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '')}.webp`}
                alt={selectedCard.card_name}
                className="w-full h-full object-cover"
                draggable={false}
                onError={(e) => {
                  e.currentTarget.src = '/cards/default-card.webp';
                }}
              />
            </div>

            {/* Card Back */}
            <div
              className="absolute inset-0 rounded-xl overflow-hidden backface-hidden"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                border: '3px solid #00BFFF',
                boxShadow: '0 0 30px #00BFFF60, 0 0 60px #00BFFF40',
                animation: 'cardPulse 2s ease-in-out infinite'
              }}
            >
              <img
                src="/cards/back.webp"
                alt="Card Back"
                className="w-full h-full object-cover"
                draggable={false}
                onError={(e) => {
                  e.currentTarget.src = '/cards/default-back.webp';
                }}
              />
            </div>
          </div>

        </div>
      )}

      {/* Badges Modal for enlarged badge view */}
      <BadgesModal
        open={showBadgesModal && !!enlargedBadge}
        onClose={() => {
          setShowBadgesModal(false);
          setEnlargedBadge(null);
        }}
        embedded={false}
      />

      <style jsx>{`
        @keyframes cardPulse {
          0%, 100% { 
            boxShadow: 0 0 30px #00BFFF60, 0 0 60px #00BFFF40;
            transform: scale(1);
          }
          50% { 
            boxShadow: 0 0 40px #00BFFF80, 0 0 80px #00BFFF60, 0 0 120px #00BFFF40;
            transform: scale(1.02);
          }
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        /* Hide any lock icons that might appear in privacy toggle */
        .privacy-toggle-button::before,
        .privacy-toggle-button::after {
          display: none !important;
          content: none !important;
        }
        .privacy-toggle-button span[aria-hidden],
        .privacy-toggle-button .lock-icon {
          display: none !important;
        }
        /* Hide unicode lock characters */
        .privacy-toggle-button {
          font-feature-settings: "liga" 0;
        }
      `}</style>

    </div>
  );
}
