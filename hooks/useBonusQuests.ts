import { useState, useEffect, useCallback } from 'react';
import { BonusQuestWithCompletion, QuestCompletionResult } from '@/types/bonusQuests';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useProfile } from '@/contexts/ProfileContext';

interface UseBonusQuestsReturn {
  quests: BonusQuestWithCompletion[]; // All quests (both DAILY and BONUS categories)
  status: "idle" | "loading" | "success" | "error";
  errorMessage: string | null;
  isLoggedIn: boolean;
  refetchQuests: () => Promise<void>;
  completeQuest: (quest: BonusQuestWithCompletion) => Promise<QuestCompletionResult>;
}

/**
 * Hook for managing quests in the Heart Coins modal
 * Handles fetching, caching, and completion of ALL quests (DAILY + BONUS) for the current user
 * Components should filter by category: q.category === 'DAILY' or q.category === 'BONUS'
 */
export function useBonusQuests(): UseBonusQuestsReturn {
  const [quests, setQuests] = useState<BonusQuestWithCompletion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [hasLoggedError, setHasLoggedError] = useState(false);
  const isLoggedIn = !!currentUserId;
  
  // Get profile context for refreshing HeartCoin balance
  const { refreshProfile } = useProfile();

  // Get current user (safe: don't error if not logged in)
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabaseBrowser.auth.getUser();
        if (error) {
          // Log but do not surface error to UI; quests are public
          console.warn('Non-fatal: getUser error; treating as logged out:', error);
        }
        setCurrentUserId(user?.id || null);
      } catch (e) {
        // Also non-fatal; treat as logged out
        console.warn('Non-fatal: exception in getCurrentUser; treating as logged out');
        setCurrentUserId(null);
      }
    };

    getCurrentUser();
  }, []);

  // Fetch bonus quests for the current user
  const fetchQuests = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      // Fetch quests via API route (bypasses RLS for public quest viewing)
      const fetchFromApi = async (): Promise<any> => {
        const url = currentUserId
          ? `/api/quests?userId=${currentUserId}`
          : '/api/quests';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch quests');
        const data = await res.json();
        return data.quests || [];
      };

      const questsData = await Promise.race([
        fetchFromApi(),
        timeoutPromise
      ]);

      setQuests(questsData);
      setStatus("success");
      setHasLoggedError(false);
    } catch (error) {
      if (!hasLoggedError) {
        console.error('Error fetching bonus quests:', error);
        setHasLoggedError(true);
      }

      setStatus("error");
      const errorMessage = error instanceof Error && error.message === 'Request timeout'
        ? 'Network timeout - please check your connection and try again'
        : 'Quests temporarily unavailable';
      setErrorMessage(errorMessage);
      setQuests([]);
    } finally {
      setHasInitialLoad(true);
    }
  }, [currentUserId, hasLoggedError]);

  // Fetch quests when user ID is available
  useEffect(() => {
    // Fetch whether logged in or not
    fetchQuests();
  }, [currentUserId, fetchQuests]);

  // Complete a quest using the idempotent RPC
  // Returns a QuestCompletionResult with alreadyCompleted flag for UI handling
  const completeQuest = useCallback(async (
    quest: BonusQuestWithCompletion
  ): Promise<QuestCompletionResult> => {
    if (!currentUserId) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    try {
      // Call the idempotent RPC directly - do NOT pass reward values from frontend
      const { data, error } = await supabaseBrowser.rpc('complete_bonus_quest_once_per_day', {
        p_user_id: currentUserId,
        p_bonus_quest_id: quest.id  // IMPORTANT: Pass bonus_quest_id, NOT quest_id
      });

      // Handle unique constraint violation (23505) as success - already completed (NOT an error)
      if (error?.code === '23505') {
        await fetchQuests(); // Refetch to update UI state
        return {
          success: true,
          alreadyCompleted: true,
          message: 'Already completed today'
        };
      }

      if (error) {
        // Only log unexpected errors, not duplicates
        return {
          success: false,
          message: 'Quest failed. Try again.'
        };
      }

      // Normalize response - handle both "completed" and "already_completed" statuses
      const isAlreadyCompleted = data?.status === 'already_completed' || data?.status === 'already_completed_today' || data?.ok === false;

      // Refetch quests and refresh profile for ALL successful completions
      await Promise.all([
        fetchQuests(),
        refreshProfile() // Refresh profile to update HeartCoin balance in UI
      ]);

      if (isAlreadyCompleted) {
        return {
          success: true,
          alreadyCompleted: true,
          message: 'Already completed today'
        };
      }

      // New completion - coins were awarded by RPC
      return {
        success: true,
        alreadyCompleted: false,
        message: 'Quest completed successfully!',
        rewards: {
          heartcoins: quest.reward_heartcoins > 0 ? quest.reward_heartcoins : undefined,
          element_card: quest.reward_element_card ? true : undefined
        }
      };
    } catch (error: any) {
      // Catch 23505 error if thrown differently (graceful handling, not an error)
      if (error?.code === '23505' || error?.message?.includes('23505')) {
        await fetchQuests();
        return {
          success: true,
          alreadyCompleted: true,
          message: 'Already completed today'
        };
      }

      return {
        success: false,
        message: 'Quest failed. Try again.'
      };
    }
  }, [currentUserId, fetchQuests, refreshProfile]);

  return {
    quests,
    status,
    errorMessage,
    isLoggedIn,
    refetchQuests: fetchQuests,
    completeQuest
  };
}
