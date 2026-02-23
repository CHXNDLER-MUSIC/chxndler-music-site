"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import PublicJournalFeed from "@/components/PublicJournalFeed";
import { sfx } from "@/lib/sfx";
import { useDailyReflectionStatus } from "@/hooks/useDailyReflectionStatus";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getLocalDateString, getDisplayDateString } from "@/utils/dateHelpers";
import { triggerHeartCoinCelebration, suppressNextHeartcoinCelebration } from "@/utils/heartcoinCelebration";
import { suppressBadgeCelebrations } from "@/utils/celebrationQueue";
import { enableCelebrationAudio } from "@/utils/celebrationAudio";
import { consumeActiveBoost } from "@/lib/boosts";
import { logHeartcoinTransaction } from "@/utils/heartcoins";
import BinderModal from "./BinderModal";
import BadgesModal from "./BadgesModal";
import UserBadges from "./UserBadges";
import UserCards from "./UserCards";
import JourneyModal from "./JourneyModal";
import TiltSpinCard from "./TiltSpinCard";
import { getCardImageUrl } from "@/lib/supabaseCardUrl";
import Image from 'next/image';
import CastToStarsOverlay, { getGlowingPlanetPosition } from "./rituals/CastToStarsOverlay";
import { ElementType } from "./planetarium/Pure3DPlanets";

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
  entry_text: {
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
  prompt?: string; // denormalized prompt text from soul_daily_prompts
  reflection?: string; // legacy field
  intention_response?: string;
  reflection_response?: string;
  entry_text?: string; // user's written reflection text
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
  const { saveJournalEntry, journalEntries, profile, user, getDailyPrompts, deleteJournalEntry, updateJournalEntry, refreshProfile, loadJournalEntries } = useProfile();
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
  const [hasAttemptedCast, setHasAttemptedCast] = useState(false);
  const [activeTab, setActiveTab] = useState<'private' | 'public'>('public');
  const [showCardsModal, setShowCardsModal] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [showFullBadgesModal, setShowFullBadgesModal] = useState(false);
  const [enlargedBadge, setEnlargedBadge] = useState<any>(null);
  const [enlargedBadgeMeta, setEnlargedBadgeMeta] = useState<{ userName: string; earnedAt: string | null } | null>(null);
  const [badgeRotation, setBadgeRotation] = useState(0);
  const [isBadgeAnimatingFlip, setIsBadgeAnimatingFlip] = useState(false);
  const [showIntegratedBinder, setShowIntegratedBinder] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardRotation, setCardRotation] = useState(0);
  const [isAnimatingFlip, setIsAnimatingFlip] = useState(false);
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false);
  const [starredByMe, setStarredByMe] = useState<Set<string>>(new Set());
  const [starringEntryId, setStarringEntryId] = useState<string | null>(null);

  // Cast to Stars ritual animation state
  const castButtonRef = useRef<HTMLButtonElement>(null);
  const [showRitualOverlay, setShowRitualOverlay] = useState(false);
  const [ritualStartPosition, setRitualStartPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingRewardData, setPendingRewardData] = useState<{ awarded: number } | null>(null);
  // Ref to store pending reward amount - avoids stale closure issues in handleRitualComplete
  const pendingRewardRef = useRef<number>(0);

  // Memoize target position for ritual overlay to prevent animation restarts.
  // getGlowingPlanetPosition returns a new object every call, which would cause
  // CastToStarsOverlay's animation useEffect to re-run on every parent re-render.
  const ritualTargetPosition = useMemo(
    () => getGlowingPlanetPosition((dailyPrompt?.element as ElementType) || null),
    [dailyPrompt?.element]
  );

  const today = getLocalDateString();
  const todayFormatted = getDisplayDateString(today);

  // Load daily prompt when opened
  useEffect(() => {
    if (isOpen) {
      loadDailyPrompt();
      setShowLoginPrompt(false);
      setHasAttemptedCast(false); // Reset cast attempt state when journal opens
      // Load starred entries for the private tab
      loadStarredEntries();
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
      setCurrentPromptText(dailyPrompt.entry_text?.text || "");
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
      // Check if entry_text contains corrupted prompt text and clear it
      const entryTextValue = todayEntry.entry_text || "";
      const isCorruptedWithPromptText = dailyPrompt &&
        (entryTextValue === dailyPrompt.entry_text?.text ||
         entryTextValue === currentPromptText);

      const isAlreadySubmitted = !isCorruptedWithPromptText && !!(entryTextValue && entryTextValue.trim().length > 0);

      setSoulStarText(isCorruptedWithPromptText ? "" : entryTextValue);
      setJournalState(prev => ({
        ...prev,
        isPrivate: !(todayEntry.is_public ?? false),
        isSubmitted: isAlreadySubmitted,
      }));

      // If entry is already submitted, dispatch event to hide pink dot in hamburger menu
      if (isAlreadySubmitted) {
        window.dispatchEvent(new CustomEvent('journalCompleted'));
        markReflectionComplete();
      }
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
    // Capture button position BEFORE any validation (for animation start point)
    let buttonPosition: { x: number; y: number } | null = null;
    if (castButtonRef.current) {
      const rect = castButtonRef.current.getBoundingClientRect();
      buttonPosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

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
      if (process.env.NODE_ENV !== "production") console.log('Saving journal entry - Daily prompt data:', {
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
        prompt: dailyPrompt?.entry_text?.text || null,
        intention: dailyPrompt?.intention?.text || null,
        entry_text: soulStarText.trim(),
        is_public: !journalState.isPrivate
      });

      if (!result) {
        throw new Error("Failed to save journal entry");
      }

      if (process.env.NODE_ENV !== "production") console.log('Successfully saved journal entry:', result);

      // Award heartcoins for journal entry (idempotent - only once per NY day per user)
      let awardedCoins = 0;
      try {
        // Get current user for idempotency check
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (!session?.user?.id) {
          if (process.env.NODE_ENV !== "production") console.warn('No authenticated user, skipping journal heartcoin award');
        } else {
          const userId = session.user.id;

          // Calculate today in NY timezone for idempotency
          const todayNY = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(new Date());

          // Check if already awarded today (idempotency check)
          const { data: existingAward } = await supabaseBrowser
            .from('heartcoin_transactions')
            .select('id')
            .eq('user_id', userId)
            .eq('transaction_type', 'earn')
            .ilike('description', '%Journal%')
            .gte('created_at', `${todayNY}T00:00:00-05:00`)
            .lt('created_at', `${todayNY}T23:59:59-05:00`)
            .limit(1)
            .maybeSingle();

          if (existingAward) {
            if (process.env.NODE_ENV !== "production") console.log('Journal heartcoins already awarded today');
            awardedCoins = 0;
          } else {
            // Attempt to consume an active reflection boost
            const boostConsumed = await consumeActiveBoost(userId, 'boost_reflection');

            // Calculate final reward amount (2x if boost was consumed)
            const baseAmount = 1;
            const multiplier = boostConsumed ? 2 : 1;
            const finalAmount = baseAmount * multiplier;

            const description = boostConsumed
              ? `Journal Entry (Reflection Boost 2x)`
              : 'Journal Entry';

            // Suppress the auto-celebration from logHeartcoinTransaction - we'll trigger it
            // manually in handleRitualComplete after the ritual animation completes
            suppressNextHeartcoinCelebration();

            await logHeartcoinTransaction(supabaseBrowser, {
              user_id: userId,
              amount: finalAmount,
              reason: 'JOURNAL_ENTRY',
              description,
              transaction_type: 'earn',
              metadata: {
                source: 'journal_entry',
                date_ny: todayNY,
                boost_applied: boostConsumed,
                boost_key: boostConsumed ? 'boost_reflection' : null,
                multiplier
              }
            });

            awardedCoins = finalAmount;
            if (process.env.NODE_ENV !== "production") console.log('Journal heartcoins award result:', {
              awarded: finalAmount,
              boostApplied: boostConsumed,
              multiplier
            });
          }
        }
      } catch (awardErr) {
        if (process.env.NODE_ENV !== "production") console.warn('Error awarding journal heartcoins:', awardErr);
      }

      // Suppress badge celebrations during the ritual animation
      suppressBadgeCelebrations(10000); // Suppressed for 10 seconds to cover the ritual animation

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

      // Switch to FULL LOG PUBLIC tab to show the user's entry
      setShowHistory(true);
      setActiveTab('public');

      // === RITUAL ANIMATION SEQUENCE ===
      // Store pending reward data for after animation completes
      // Use both state and ref - ref ensures no stale closure issues
      if (awardedCoins > 0) {
        pendingRewardRef.current = awardedCoins;
        setPendingRewardData({ awarded: awardedCoins });
      }

      // Store button position for animation start point
      if (buttonPosition) {
        setRitualStartPosition(buttonPosition);
      }

      // Small delay to ensure panel close animation starts, then show ritual overlay
      setTimeout(() => {
        if (buttonPosition) {
          setShowRitualOverlay(true);
        } else {
          // If no button position, skip animation and trigger rewards immediately
          if (awardedCoins > 0) {
            // Unlock celebration audio (user just interacted by clicking Cast)
            enableCelebrationAudio();
            // Suppress first to block the realtime subscription duplicate, then
            // force-trigger the intended celebration
            suppressNextHeartcoinCelebration();
            triggerHeartCoinCelebration(awardedCoins, { force: true });
          }
          onJournalCompleted?.();
          try {
            window.dispatchEvent(new CustomEvent('journalCompleted'));
          } catch {}
        }
      }, 100);

      // Note: onJournalCompleted and journalCompleted event will be triggered
      // in handleRitualComplete after the animation finishes

    } catch (error) {
      console.error('Failed to save journal entry:', error);
      console.error('Full error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });
      
      let errorMessage = "Failed to cast your signal. Please try again.";
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        if (error.message.includes('Authentication error') || error.message.includes('No user session') || error.message.includes('must be logged in')) {
          errorMessage = "Please log in again to save your entry.";
        } else if (error.message.includes('foreign key') || error.message.includes('fkey')) {
          // Foreign key constraint - profile row may be missing
          errorMessage = "Profile sync issue. Please refresh the page and try again.";
          console.error('[SoulStarJournal] Foreign key constraint error - profile may not exist:', error.message);
        } else if (error.message.includes('permission denied') || error.message.includes('403')) {
          // RLS policy violation or permission issue
          errorMessage = "Permission denied. Please log out and log back in.";
          console.error('[SoulStarJournal] Permission denied error:', error.message);
        } else if (error.message.includes('permission') || error.message.includes('auth')) {
          errorMessage = "Authentication error. Please refresh the page and try again.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message.includes('unique') || error.message.includes('constraint')) {
          if (process.env.NODE_ENV !== "production") console.log('Unique constraint error - checking local journal entries vs database');
          if (process.env.NODE_ENV !== "production") console.log('Current journalEntries length:', journalEntries.length);
          if (process.env.NODE_ENV !== "production") console.log('Today entry in local state:', journalEntries.find(entry => 
            entry.entry_date === getLocalDateString() && entry.element === dailyPrompt?.element
          ));
          
          errorMessage = "Entry may already exist. Refreshing data and please try again.";
          // Refresh journal entries to sync with database state
          if (user?.id) {
            loadJournalEntries(user.id).catch(console.error);
          }
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

  // Callback when ritual animation completes - triggers reward celebration
  const handleRitualComplete = useCallback(() => {
    // Hide the overlay
    setShowRitualOverlay(false);
    setRitualStartPosition(null);

    // Trigger reward celebration if there are pending coins
    // Use ref to avoid stale closure issues (ref is always current)
    const rewardAmount = pendingRewardRef.current;
    if (rewardAmount > 0) {
      // Unlock celebration audio (user interacted by clicking Cast)
      enableCelebrationAudio();
      // Suppress first to block the realtime subscription duplicate, then
      // force-trigger the intended celebration (bypasses the suppression we just set)
      suppressNextHeartcoinCelebration();
      triggerHeartCoinCelebration(rewardAmount, { force: true });
      pendingRewardRef.current = 0;
      setPendingRewardData(null);
    }

    // Notify parent that journal was completed
    onJournalCompleted?.();

    // Broadcast event so other UI can update
    try {
      window.dispatchEvent(new CustomEvent('journalCompleted'));
    } catch {}
  }, [onJournalCompleted]);

  const handleEntryClick = (entryId: string) => {
    sfx.play('click', 0.6);
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
    setEditingEntry(null);
  };

  const handleEditClick = (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    sfx.play('click', 0.6);
    setEditingEntry(entry.entry_id);
    setEditResponse(entry.entry_text || "");
  };

  const handleSaveEdit = async (entryId: string) => {
    try {
      sfx.play('click', 0.8);
      await updateJournalEntry(entryId, { entry_text: editResponse.trim() });
      
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

  const loadStarredEntries = async () => {
    // Fetch which entries the current user has starred
    if (user?.id) {
      try {
        const { data: starredData, error: starredError } = await supabaseBrowser
          .from('journal_entry_stars')
          .select('entry_id')
          .eq('user_id', user.id);

        if (!starredError && starredData) {
          const starredIds = new Set(starredData.map(row => row.entry_id));
          setStarredByMe(starredIds);
        }
      } catch (error) {
        console.error('Error loading starred entries:', error);
      }
    }
  };

  const handleToggleStar = async (entryId: string) => {
    try {
      // Require authentication to star entries
      if (!user?.id) {
        if (openWelcomeHome) openWelcomeHome();
        return;
      }

      // Prevent double-clicks while request is in flight
      if (starringEntryId) return;

      setStarringEntryId(entryId);

      const isCurrentlyStarred = starredByMe.has(entryId);

      // Optimistic update: toggle star state
      if (isCurrentlyStarred) {
        setStarredByMe(prev => {
          const next = new Set(prev);
          next.delete(entryId);
          return next;
        });
      } else {
        setStarredByMe(prev => new Set(prev).add(entryId));
      }

      // Call the RPC to toggle the star (server is source of truth)
      const { error } = await supabaseBrowser
        .rpc('toggle_journal_entry_star', { p_entry_id: entryId });

      if (error) {
        console.error('Error toggling star:', error);
        // Revert optimistic update on failure
        if (isCurrentlyStarred) {
          setStarredByMe(prev => new Set(prev).add(entryId));
        } else {
          setStarredByMe(prev => {
            const next = new Set(prev);
            next.delete(entryId);
            return next;
          });
        }
        setStarringEntryId(null);
        return;
      }

      // Refresh journalEntries to keep entries in sync
      if (user?.id) {
        loadJournalEntries(user.id);
      }

      setStarringEntryId(null);
    } catch (error) {
      console.error('Failed to toggle star:', error);
      setStarringEntryId(null);
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

  // Helper function to get card images (same as in BinderModal)
  const getCardImage = (songName: string, element: string) => {
    const songImages: { [key: string]: string } = {
      'ALWAYS ON MY MIND': getCardImageUrl('HEART'),
      'ALWAYS ON MY MIND (REMIX)': getCardImageUrl('ALWAYS ON MY MIND (REMIX)'),
      'ALONE': getCardImageUrl('DARKNESS'),
      'ALONE (ACOUSTIC)': getCardImageUrl('DARKNESS'),
      'AMERICAN DREAM': getCardImageUrl('AMERICAN DREAM'),
      'BABY': getCardImageUrl('BABY'),
      'BE MY BEE': getCardImageUrl('BE MY BEE'),
      'BE MY BEE (ACOUSTIC)': getCardImageUrl('BE MY BEE (ACOUSTIC)'),
      'BLUE (ACOUSTIC)': getCardImageUrl('BLUE (ACOUSTIC)'),
      'BLUE': getCardImageUrl('LIGHTNING'),
      'BRAIN FREEZE': getCardImageUrl('BRAIN FREEZE'),
      'CHEERLEADER': getCardImageUrl('CHEERLEADER'),
      'CHEERLEADER (ACOUSTIC)': getCardImageUrl('CHEERLEADER (ACOUSTIC)'),
      'CHXNDLER': getCardImageUrl('CHXNDLER'),
      'COLLIDE': getCardImageUrl('HEART'),
      'COLORS OF OUR HOME': getCardImageUrl('COLORS OF OUR HOME'),
      'COLORS OF OUR HOME (ACOUSTIC)': getCardImageUrl('COLORS OF OUR HOME (ACOUSTIC)'),
      'COLORS OF OUR HOME (BLUMA Game Soundtrack)': getCardImageUrl('COLORS OF OUR HOME (BLUMA GAME SOUNDTRACK)'),
      'FEELING THIS': getCardImageUrl('LIGHTNING'),
      'GAME BOY HEART': getCardImageUrl('GAME BOY HEART'),
      'HOME': getCardImageUrl('HOME'),
      'HOME (ACOUSTIC)': getCardImageUrl('HOME (ACOUSTIC)'),
      'HOUSE PARTY': getCardImageUrl('HOUSE PARTY'),
      'HOUSE PARTY (ACOUSTIC)': getCardImageUrl('HOUSE PARTY (ACOUSTIC)'),
      'I MIGHT FALL IN LOVE WITH YOU': getCardImageUrl('I MIGHT FALL IN LOVE WITH YOU'),
      'I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)': getCardImageUrl('I MIGHT FALL IN LOVE WITH YOU (ACOUSTIC)'),
      'KID FOREVER': getCardImageUrl('KID FOREVER'),
      'LETTING GO': getCardImageUrl('WATER'),
      'LITTLE BLACK HEART': getCardImageUrl('LITTLE BLACK HEART'),
      'LITTLE BLACK HEART (ACOUSTIC)': getCardImageUrl('LITTLE BLACK HEART (ACOUSTIC)'),
      'LOVE ME': getCardImageUrl('LOVE ME'),
      'LOVE ME (ACOUSTIC)': getCardImageUrl('LOVE ME (ACOUSTIC)'),
      'MR. BRIGHTSIDE': getCardImageUrl('MR. BRIGHTSIDE'),
      'OCEAN GIRL': getCardImageUrl('OCEAN GIRL'),
      'OCEAN GIRL (ACOUSTIC)': getCardImageUrl('OCEAN GIRL (ACOUSTIC)'),
      'OCEAN GIRL (REMIX)': getCardImageUrl('OCEAN GIRL (REMIX)'),
      'PARIS': getCardImageUrl('PARIS'),
      'PINK MOON': getCardImageUrl('PINK MOON'),
      'POKÉMON': getCardImageUrl('POKEMON'),
      'SOMEBODY TO LOVE': getCardImageUrl('HEART'),
      'TIENES UN AMIGO': getCardImageUrl('TIENES UN AMIGO'),
      'WE\'RE JUST FRIENDS': getCardImageUrl('WE\'RE JUST FRIENDS'),
      'WE\'RE JUST FRIENDS (ACOUSTIC)': getCardImageUrl('WE\'RE JUST FRIENDS (ACOUSTIC)'),
      'WE\'RE JUST FRIENDS (DMVRCO REMIX)': getCardImageUrl('WE\'RE JUST FRIENDS (DMVRCO REMIX)'),
      'WE\'RE JUST FRIENDS (mickey jas REMIX)': getCardImageUrl('WE\'RE JUST FRIENDS (MICKEY JAS REMIX)'),
      // Elemental cards
      'WATER': getCardImageUrl('WATER'),
      'HEART': getCardImageUrl('HEART'),
      'LIGHTNING': getCardImageUrl('LIGHTNING'),
      'DARKNESS': getCardImageUrl('DARKNESS'),
    };

    return songImages[songName] || getCardImageUrl(element);
  };

  // Handle card click to show popup
  const handleCardClick = (card: any) => {
    try {
      sfx.play('card-ding', 0.45);
    } catch {}

    setIsCardFlipped(false); // Reset to show front of card
    setSelectedCard({
      name: card.card_name,
      image: getCardImage(card.card_name, card.element),
      rarity: card.rarity,
      element: card.element
    });
    setCardOpen(true);
  };

  // Handle badge click to show enlarged view
  const handleBadgeClick = async (badge: any, opts?: { userId?: string; userName?: string | null }) => {
    try { sfx.play('click', 0.6); } catch {}
    setEnlargedBadge(badge);

    // Default meta while loading
    setEnlargedBadgeMeta({ userName: opts?.userName || profile?.name || 'User', earnedAt: null });

    // If we know the user, fetch the claimed date for this badge
    if (opts?.userId && badge?.id) {
      try {
        const { data, error } = await supabaseBrowser
          .from('user_badges')
          .select('earned_at')
          .eq('user_id', opts.userId)
          .eq('badge_id', badge.id)
          .maybeSingle();
        if (!error) {
          setEnlargedBadgeMeta(prev => ({ userName: opts?.userName || prev?.userName || 'User', earnedAt: data?.earned_at || null }));
        }
      } catch (e) {
        // ignore fetch errors; keep defaults
      }
    }
  };


  // Render ritual overlay even when journal is closed (animation plays after close)
  if (!isOpen) {
    // Only render the ritual overlay if animation is active
    if (showRitualOverlay && ritualStartPosition) {
      return (
        <CastToStarsOverlay
          startPosition={ritualStartPosition}
          targetPosition={ritualTargetPosition}
          onComplete={handleRitualComplete}
          element={dailyPrompt?.element as ElementType || null}
        />
      );
    }
    return null;
  }

  if (!dailyPrompt) {
    return null; // Don't show loading popup, just return null
  }

  const currentElement = dailyPrompt.element as keyof typeof ELEMENT_COLORS;
  const elementTheme = ELEMENT_COLORS[currentElement] || ELEMENT_COLORS.heart;
  const elementEmoji = ELEMENT_EMOJIS[currentElement] || "💖";

  return (
    <div
      className="fixed z-[100005] flex items-stretch justify-center pointer-events-none"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 'calc(var(--light-beam-boundary) + var(--beam-height))',
        paddingTop: '8vh',
        paddingLeft: '16px',
        paddingRight: '20px'
      }}
    >

      {/* Card popup - match Binder popout visuals */}
      {cardOpen && selectedCard && (
        <div
          className="absolute inset-0 flex items-start justify-center z-50 pointer-events-auto"
          style={{ paddingTop: '56px', paddingLeft: '16px', paddingRight: '20px' }}
          onClick={() => {
            try { sfx.play('close', 0.8); } catch {}
            setCardOpen(false);
            setIsCardFlipped(false);
            setCardRotation(0);
            setIsAnimatingFlip(false);
          }}
        >
          {/* Constrain overlay to the journal panel bounds */}
          <div
            className="relative flex items-center justify-center pointer-events-auto w-full max-w-4xl sm:min-w-[460px] mx-auto h-full"
            style={{
              background: 'rgba(0, 0, 0, 0.9)',
              border: `1px solid ${elementTheme.color}60`,
              boxShadow: `0 0 30px ${elementTheme.color}60, 0 0 60px ${elementTheme.color}40`,
              borderRadius: '14px',
              backdropFilter: 'blur(12px)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Back arrow - positioned at top left inside panel */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                try { sfx.play('close', 0.8); } catch {}
                setCardOpen(false);
                setIsCardFlipped(false);
                setCardRotation(0);
                setIsAnimatingFlip(false);
              }}
              onMouseEnter={() => { try { sfx.play('hover', 0.3); } catch {} }}
              className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-pink-400 hover:text-pink-200 transition-all duration-200 z-20"
              style={{
                background: 'rgba(255,105,180,0.1)',
                border: '2px solid #FF69B4',
                boxShadow: '0 0 20px rgba(255,105,180,0.8), 0 0 30px rgba(255,105,180,0.6), 0 0 40px rgba(255,105,180,0.4)',
                textShadow: '0 0 10px rgba(255,105,180,0.8)',
                backdropFilter: 'blur(10px)'
              }}
              aria-label="Close card"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* TiltSpinCard wrapper for drag-to-spin interaction */}
            <div
              className="relative flex items-center justify-center"
              style={{
                width: '100%',
                height: '100%',
                animation: 'cardPulse 3s ease-in-out infinite',
              }}
            >
              <TiltSpinCard
                className="relative flex items-center justify-center"
                style={{ width: '100%', height: '100%', borderRadius: '24px' }}
                maxRotateX={10}
                sensitivity={0.3}
                returnDuration={400}
                enableSpin={true}
                spinSensitivity={0.8}
                onRotationChange={setCardRotation}
                onClick={() => {
                  try { sfx.play('flip', 0.45); } catch {}
                  setIsAnimatingFlip(true);
                  setCardRotation(prev => prev + 180);
                  setTimeout(() => setIsAnimatingFlip(false), 500);
                }}
              >
                {/* Front of card - rotates with cardRotation */}
                <img
                  src={selectedCard?.image || getCardImageUrl('CHXNDLER')}
                  alt={selectedCard?.name || "Card"}
                  className="rounded-2xl pointer-events-none"
                  style={{
                    maxHeight: '95%',
                    maxWidth: '85%',
                    objectFit: 'contain',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: `rotateY(${cardRotation}deg)`,
                    transition: isAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    border: '2px solid rgba(255,255,255,0.1)',
                  }}
                  draggable={false}
                  onError={(e) => {
                    const objectKey = selectedCard?.name || 'CHXNDLER';
                    if (process.env.NODE_ENV !== "production") console.warn('[CardImage] Failed to load card image', { objectKey, attemptedUrl: e.currentTarget.src });
                    const fallback = getCardImageUrl('CHXNDLER');
                    if (e.currentTarget.src !== fallback) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />

                {/* Back of card - offset by 180° */}
                <img
                  src={getCardImageUrl('BACK')}
                  alt="Card Back"
                  className="absolute rounded-2xl pointer-events-none"
                  style={{
                    maxHeight: '95%',
                    maxWidth: '85%',
                    objectFit: 'contain',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotateY(${cardRotation + 180}deg)`,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transition: isAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    border: '2px solid rgba(255,255,255,0.1)',
                  }}
                  draggable={false}
                />
              </TiltSpinCard>
            </div>
          </div>
        </div>
      )}

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
          className="w-full max-w-4xl sm:min-w-[460px] mx-auto pointer-events-auto transition-all duration-300"
          style={{
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(0, 0, 0, 0.7)',
            border: `1px solid ${activeTab === 'public' ? '#00FF00' : '#FF69B4'}60`,
            boxShadow: activeTab === 'public'
              ? '0 0 30px #00FF0060, 0 0 60px #00FF0040, 0 0 100px #00FF0020'
              : '0 0 30px #FF69B460, 0 0 60px #FF69B440, 0 0 100px #FF69B420',
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
              onMouseEnter={(e) => {
                try { sfx.play('hover', 0.6); } catch {}
                e.currentTarget.style.boxShadow = '0 0 20px #00FFFF, 0 0 40px #00FFFF80, 0 0 60px #00FFFF60';
                e.currentTarget.style.textShadow = '0 0 12px #00FFFF, 0 0 20px #00FFFF, 0 0 35px #00FFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 15px #00FFFF, 0 0 30px #00FFFF60';
                e.currentTarget.style.textShadow = '0 0 8px #00FFFF, 0 0 15px #00FFFF, 0 0 25px #00FFFF';
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
              className="text-2xl font-bold tracking-wider mt-0.5 mb-3"
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
          <div
            className="flex items-center justify-center gap-4 px-3 py-1 border-b transition-all duration-300"
            style={{
              borderColor: activeTab === 'public' ? '#00FF0040' : '#FF69B440',
              boxShadow: activeTab === 'public'
                ? '0 4px 15px #00FF0030, 0 2px 8px #00FF0020'
                : '0 4px 15px #FF69B430, 0 2px 8px #FF69B420'
            }}
          >
            <button
              onClick={() => {
                try { sfx.play('change-channel', 0.8); } catch {}
                setActiveTab('public');
              }}
              onMouseEnter={(e) => {
                try { sfx.play('hover', 0.6); } catch {}
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.boxShadow = '0 0 20px #00FF00, 0 0 35px #00FF0080, 0 0 50px #00FF0060';
                e.currentTarget.style.textShadow = '0 0 10px #00FF00, 0 0 18px #00FF00, 0 0 28px #00FF00';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = activeTab === 'public' ? '0 0 15px #00FF0060, 0 0 25px #00FF0040' : 'none';
                e.currentTarget.style.textShadow = activeTab === 'public' ? '0 0 8px #00FF00, 0 0 15px #00FF00' : 'none';
              }}
              className="px-12 py-2.5 rounded text-base font-semibold uppercase transition-all duration-200"
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
              onMouseEnter={(e) => {
                try { sfx.play('hover', 0.6); } catch {}
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.boxShadow = '0 0 20px #FF69B4, 0 0 35px #FF69B480, 0 0 50px #FF69B460';
                e.currentTarget.style.textShadow = '0 0 10px #FF69B4, 0 0 18px #FF69B4, 0 0 28px #FF69B4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = activeTab === 'private' ? '0 0 15px #FF69B460, 0 0 25px #FF69B440' : 'none';
                e.currentTarget.style.textShadow = activeTab === 'private' ? '0 0 8px #FF69B4, 0 0 15px #FF69B4' : 'none';
              }}
              className="px-12 py-2.5 rounded text-base font-semibold uppercase transition-all duration-200"
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
          <div className="journal-scroll mt-3 space-y-3 flex-1 overflow-y-auto pr-1 pl-2">
            {activeTab === 'private' && (
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
                            {/* Soul Star Display (read-only for own entries) */}
                            <div
                              className="flex items-center gap-1 px-2 py-1 cursor-default"
                              style={{
                                background: 'transparent',
                                opacity: 0.7
                              }}
                            >
                              <Image
                                src="/elements/soul-star.webp"
                                alt="Soul Star"
                                width={24}
                                height={24}
                                style={{
                                  filter: `drop-shadow(0 0 6px ${entryTheme.color}) drop-shadow(0 0 10px ${entryTheme.glow}) brightness(1.0)`
                                }}
                              />
                              <span
                                className="text-sm font-semibold"
                                style={{
                                  color: entryTheme.color,
                                  textShadow: `0 0 4px ${entryTheme.glow}`
                                }}
                              >
                                {entry.stars_count ?? 0}
                              </span>
                            </div>
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
                              width="16" 
                              height="16" 
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
                                className="text-base font-semibold uppercase tracking-wider"
                              style={{ color: entryTheme.color, textShadow: `0 0 4px ${entryTheme.glow}` }}
                            >
                              QUESTION OF THE DAY
                            </div>
                          </div>
                          <div className="text-base leading-relaxed text-white/90">{entry.prompt || "No prompt available"}</div>
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
                                className="text-base font-semibold uppercase tracking-wider"
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
                              className="w-full h-20 p-2 rounded text-white text-sm placeholder-white/50 resize-none focus:outline-none"
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
                              {entry.entry_text || "No entry text"}
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
            )}
            {activeTab === 'public' && (
              <PublicJournalFeed
                onStarToggle={() => {
                  // Refresh journal entries to sync stars_count in private tab
                  if (user?.id) {
                    loadJournalEntries(user.id);
                  }
                }}
              />
            )}
          </div>
        </div>
      ) : (
        /* Today's Journal Interface */
        <div
          className="w-full max-w-4xl sm:min-w-[460px] mx-auto pointer-events-auto"
          style={{
            height: '100%',
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
            className="rounded-lg px-1 pt-2 pb-0 space-y-1 flex flex-col flex-1"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              border: `1px solid ${elementTheme.color}60`,
              boxShadow: `0 0 30px ${elementTheme.color}60, 0 0 60px ${elementTheme.color}40, 0 0 100px ${elementTheme.color}20`,
              borderRadius: '12px'
            }}
          >
            {/* Title Section */}
              <div className="text-center mb-1 relative">

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
                className="text-2xl font-bold tracking-wider mt-0.5 mb-0.5"
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
            <div className="relative pb-12">
              {/* FULL LOG on left; Date centered */}
              <button
                onClick={() => {
                  try { sfx.play('click', 0.8); } catch {}
                  setShowHistory(!showHistory);
                }}
                onMouseEnter={(e) => {
                  try { sfx.play('hover', 0.6); } catch {}
                  e.currentTarget.style.boxShadow = '0 0 20px #00FFFF, 0 0 40px #00FFFF80, 0 0 60px #00FFFF60';
                  e.currentTarget.style.textShadow = '0 0 12px #00FFFF, 0 0 20px #00FFFF, 0 0 35px #00FFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 15px #00FFFF, 0 0 30px #00FFFF60';
                  e.currentTarget.style.textShadow = '0 0 8px #00FFFF, 0 0 15px #00FFFF, 0 0 25px #00FFFF';
                }}
                className="absolute top-0 left-0 text-base font-semibold transition-all duration-200 hover:opacity-100 hover:scale-105 px-3 py-1.5 rounded"
                style={{
                  color: '#00FFFF',
                  textShadow: `0 0 8px #00FFFF, 0 0 15px #00FFFF, 0 0 25px #00FFFF`,
                  background: '#00FFFF30',
                  border: `1px solid #00FFFF`,
                  boxShadow: `0 0 15px #00FFFF, 0 0 30px #00FFFF60`,
                  cursor: 'pointer',
                  zIndex: 20,
                }}
              >
                {showHistory ? 'TODAY' : 'FULL LOG'}
              </button>
              <div 
                className="absolute top-0 left-1/2 transform -translate-x-1/2 text-xl font-semibold"
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
                  if (process.env.NODE_ENV !== "production") console.log('Privacy button clicked!', journalState.isPrivate);
                  try {
                    sfx.play('change-channel', 0.8);
                  } catch (e) {
                    if (process.env.NODE_ENV !== "production") console.log('SFX not available');
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
                onMouseEnter={(e) => {
                  try { sfx.play('hover', 0.6); } catch {}
                  const color = journalState.isPrivate ? '#FF69B4' : '#00FF00';
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.boxShadow = `0 0 20px ${color}, 0 0 35px ${color}80, 0 0 50px ${color}60`;
                  e.currentTarget.style.textShadow = `0 0 10px ${color}, 0 0 18px ${color}, 0 0 28px ${color}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.textShadow = journalState.isPrivate ? '0 0 8px #FF69B4, 0 0 15px #FF69B4' : '0 0 8px #00FF00, 0 0 15px #00FF00';
                }}
                className="absolute top-0 right-0 px-3 py-1 rounded text-sm font-semibold transition-all duration-200 z-10"
                style={{
                  background: journalState.isPrivate ? '#FF69B420' : '#00FF0020',
                  border: `2px solid ${journalState.isPrivate ? '#FF69B4' : '#00FF00'}`,
                  color: journalState.isPrivate ? '#FF69B4' : '#00FF00',
                  textShadow: journalState.isPrivate ? '0 0 8px #FF69B4, 0 0 15px #FF69B4' : '0 0 8px #00FF00, 0 0 15px #00FF00',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  zIndex: 10
                }}
              >
{journalState.isPrivate ? 'PRIVATE' : 'PUBLIC'}
              </button>
              
              {/* Element label - centered below date (icon removed) */}
              <div 
                className="absolute left-1/2 transform -translate-x-1/2 px-3 py-1 text-lg font-semibold uppercase"
                style={{
                  top: '25px',
                  color: elementTheme.color,
                  textShadow: 'none'
                }}
              >
                {dailyPrompt?.element?.toUpperCase()}
              </div>
            </div>

            {/* Section Cards */}
            {dailyPrompt && (
              <div className="flex flex-col flex-1 mt-16">
                {/* Prompt Card */}
                <div
                  className="rounded-lg px-2 pt-2 pb-3 -mx-1"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `1px solid ${elementTheme.color}60`,
                    boxShadow: `0 0 15px ${elementTheme.color}60, 0 0 30px ${elementTheme.color}30, inset 0 0 10px ${elementTheme.color}20`
                  }}
                >
                  <div className="space-y-0">
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
                        className="text-lg font-semibold uppercase tracking-wider"
                        style={{ color: elementTheme.color, textShadow: `0 0 4px ${elementTheme.glow}` }}
                      >
                        QUESTION OF THE DAY
                      </div>
                    </div>
                    <div
                      className="text-lg leading-tight"
                      style={{
                        color: dailyPrompt.entry_text?.text ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                        lineHeight: '1.15'
                      }}
                    >
                      {dailyPrompt.entry_text?.text || 'No prompt was generated for this day.'}
                    </div>
                  </div>
                </div>

                {/* Soul Star Card */}
                <div
                  className="rounded-lg px-2 pt-2 pb-3 -mx-1 mb-2 flex-1"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `1px solid ${elementTheme.color}60`,
                    boxShadow: `0 0 15px ${elementTheme.color}60, 0 0 30px ${elementTheme.color}30, inset 0 0 10px ${elementTheme.color}20`
                  }}
                >
                  <div className="space-y-1 h-full flex flex-col">
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
                        className="text-lg font-semibold uppercase tracking-wider"
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
                      className="w-full flex-1 min-h-[60px] px-2 py-2 rounded-lg text-white text-lg placeholder-white/50 resize-none focus:outline-none transition-all"
                      disabled={isSaving || journalState.isSubmitted}
                      style={{
                        background: 'rgba(0,0,0,0.4)',
                        border: `1px solid ${elementTheme.color}30`,
                        boxShadow: `0 0 8px ${elementTheme.color}15`,
                        opacity: (isSaving || journalState.isSubmitted) ? 0.7 : 1,
                        pointerEvents: (isSaving || journalState.isSubmitted) ? 'none' as any : 'auto',
                        lineHeight: '1.1'
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
            <div className="flex gap-3 pb-2 mt-auto">
                  {(!user?.id || !profile?.element) ? (
                    <button
                      onClick={() => {
                        if (!hasAttemptedCast) {
                          // First click: play star sound and change button text
                          sfx.play('star', 0.8);
                          setHasAttemptedCast(true);
                        } else {
                          // Second click: play button sound and open welcome home
                          sfx.play('button', 0.8);
                          onClose();
                          // Set flag to reopen journal after profile creation
                          sessionStorage.setItem('reopenJournalAfterLogin', 'true');
                          setTimeout(() => {
                            if (openWelcomeHome) {
                              openWelcomeHome();
                            }
                          }, 100);
                        }
                      }}
                      className="flex-1 px-4 py-2 rounded-lg text-base font-semibold transition-all duration-200 hover:opacity-90"
                      style={hasAttemptedCast ? {
                        background: 'rgba(57, 255, 20, 0.15)',
                        color: '#39FF14',
                        border: '2px solid #39FF14',
                        boxShadow: '0 0 20px #39FF14, 0 0 40px #39FF1460, inset 0 0 15px #39FF1430',
                        textShadow: '0 0 8px #39FF14, 0 0 15px #39FF14, 0 0 25px #39FF14'
                      } : {
                        background: 'rgba(255, 255, 0, 0.15)',
                        color: '#FFFF00',
                        border: '2px solid #FFFF00',
                        boxShadow: '0 0 20px #FFFF00, 0 0 40px #FFFF0060, inset 0 0 15px #FFFF0030',
                        textShadow: '0 0 8px #FFFF00, 0 0 15px #FFFF00, 0 0 25px #FFFF00'
                      }}
                    >
                      {hasAttemptedCast ? 'Create ALIEN profile to submit' : 'Cast into the Stars'}
                    </button>
                  ) : (
                    <button
                      ref={castButtonRef}
                      onClick={journalState.isSubmitted ? undefined : handleSaveEntry}
                      disabled={!journalState.isSubmitted && (!soulStarText.trim() || isSaving)}
                      className="flex-1 px-4 py-2 rounded-lg text-base font-semibold transition-all duration-200 disabled:opacity-40"
                      style={{
                        background: journalState.isSubmitted
                          ? 'rgba(57, 255, 20, 0.2)'
                          : `linear-gradient(135deg, ${elementTheme.color}60, ${elementTheme.color}80)`,
                        color: journalState.isSubmitted ? '#39FF14' : elementTheme.color,
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

      {/* Full Badges Modal - opened when clicking on badge in journal profile section */}
      {showFullBadgesModal && (
        <BadgesModal 
          open={showFullBadgesModal}
          onClose={() => setShowFullBadgesModal(false)}
        />
      )}


      {/* Enlarged Badge Popup Modal - contained within journal panel bounds */}
      {enlargedBadge && (
        <div
          className="absolute inset-0 flex items-start justify-center z-50 pointer-events-auto"
          style={{ paddingTop: '56px', paddingLeft: '16px', paddingRight: '20px' }}
          onClick={() => {
            setEnlargedBadge(null);
            setEnlargedBadgeMeta(null);
            setBadgeRotation(0);
          }}
        >
          {/* Constrain overlay to the journal panel bounds */}
          <div
            className="relative flex flex-col items-center justify-center pointer-events-auto w-full max-w-4xl sm:min-w-[460px] mx-auto h-full"
            style={{
              background: 'rgba(0, 0, 0, 0.9)',
              border: `1px solid ${elementTheme.color}60`,
              boxShadow: `0 0 30px ${elementTheme.color}60, 0 0 60px ${elementTheme.color}40`,
              borderRadius: '14px',
              backdropFilter: 'blur(12px)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button - top right */}
            <button
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full z-10 transition-all duration-200 hover:scale-110"
              style={{
                background: 'rgba(0, 0, 0, 0.6)',
                border: '2px solid #FF69B4',
                boxShadow: '0 0 10px #FF69B440',
              }}
              onClick={() => {
                try { sfx.play('close', 0.8); } catch {}
                setEnlargedBadge(null);
                setEnlargedBadgeMeta(null);
                setBadgeRotation(0);
              }}
              aria-label="Close badge"
            >
              <span className="text-white text-xl font-bold leading-none">×</span>
            </button>

            {/* Touch capture container */}
            <div
              className="relative"
              style={{
                touchAction: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <TiltSpinCard
                className="relative cursor-grab active:cursor-grabbing"
                style={{
                  width: 'min(70vw, 280px)',
                  height: 'min(70vw, 280px)',
                  touchAction: 'none',
                  perspective: '1000px',
                }}
                maxRotateX={10}
                sensitivity={0.3}
                returnDuration={400}
                enableSpin={true}
                spinSensitivity={0.8}
                onRotationChange={setBadgeRotation}
                onClick={() => {
                  try {
                    sfx.play('flip', 0.8);
                  } catch {
                    try {
                      const audio = new Audio('/audio/flip.mp3');
                      audio.volume = 0.8;
                      audio.play();
                    } catch {}
                  }
                  setIsBadgeAnimatingFlip(true);
                  setBadgeRotation(prev => prev + 180);
                  setTimeout(() => setIsBadgeAnimatingFlip(false), 500);
                }}
              >
                {/* 3D container for badge */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: `rotateY(${badgeRotation}deg)`,
                    transition: isBadgeAnimatingFlip ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    pointerEvents: 'none',
                  }}
                >
                  {/* Front of badge */}
                  <div
                    className="absolute inset-0 w-full h-full rounded-full overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                      border: '3px solid #FF69B4',
                      boxShadow: '0 0 30px #FF69B460, 0 0 60px #FF69B440',
                    }}
                  >
                    <img
                      src={enlargedBadge.icon_url || enlargedBadge.badge_image_url || '/elements/badges.webp'}
                      alt={enlargedBadge.badge_name || 'Badge'}
                      className="w-full h-full object-cover"
                      draggable={false}
                      onError={(e) => {
                        e.currentTarget.src = '/elements/badges.webp';
                      }}
                    />
                  </div>

                  {/* Back of badge */}
                  <div
                    className="absolute inset-0 w-full h-full rounded-full overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                      border: '3px solid #FF69B4',
                      boxShadow: '0 0 30px #FF69B460, 0 0 60px #FF69B440',
                    }}
                  >
                    {/* Blank back so text is readable */}
                    {/* Claim details overlay */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center text-center px-3"
                    >
                      <div className="text-white font-bold text-lg truncate max-w-[160px]" style={{ textShadow: '0 0 8px rgba(255,105,180,0.8)' }}>
                        {enlargedBadgeMeta?.userName || profile?.name || 'User'}
                      </div>
                      <div className="text-base font-semibold mt-1 tracking-wider" style={{ color: '#39FF14', textShadow: '0 0 8px #39FF14, 0 0 14px #39FF14' }}>CLAIMED</div>
                      <div className="text-white/80 text-base mt-0.5">
                        {(() => {
                          const raw = enlargedBadgeMeta?.earnedAt;
                          if (!raw) return '';
                          const d = new Date(raw);
                          const mm = (d.getMonth() + 1).toString();
                          const dd = d.getDate().toString();
                          const yyyy = d.getFullYear().toString();
                          return `${mm}/${dd}/${yyyy}`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </TiltSpinCard>
            </div>

            {/* Badge Info - BELOW the badge */}
            <div
              className="mt-6 px-6 py-3 rounded-lg text-center"
              style={{
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid #FF69B4',
                boxShadow: '0 0 15px #FF69B440',
                maxWidth: '90%',
              }}
            >
              <div className="text-white font-semibold text-xl">
                {enlargedBadge.badge_name || 'Badge'}
              </div>
              {enlargedBadge.description && (
                <div className="text-white/70 text-sm mt-2">
                  {enlargedBadge.description}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Journey Modal */}
      <JourneyModal 
        open={isJourneyModalOpen} 
        onClose={() => setIsJourneyModalOpen(false)} 
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
        @keyframes badgePulse {
          0%, 100% { 
            boxShadow: 0 0 30px #FF69B460, 0 0 60px #FF69B440;
            transform: scale(1);
          }
          50% { 
            boxShadow: 0 0 40px #FF69B480, 0 0 80px #FF69B460, 0 0 120px #FF69B440;
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

      {/* Render ritual overlay when journal is open and animation is active */}
      {showRitualOverlay && ritualStartPosition && (
        <CastToStarsOverlay
          startPosition={ritualStartPosition}
          targetPosition={ritualTargetPosition}
          onComplete={handleRitualComplete}
          element={dailyPrompt?.element as ElementType || null}
        />
      )}

    </div>
  );
}
