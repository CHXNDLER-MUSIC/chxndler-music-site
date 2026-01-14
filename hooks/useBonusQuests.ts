import { useState, useEffect, useCallback } from 'react';
import { BonusQuestWithCompletion, QuestCompletionResult } from '@/types/bonusQuests';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useProfile } from '@/contexts/ProfileContext';
import { triggerHeartCoinCelebration } from '@/utils/heartcoinCelebration';

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

  // Get current user via getSession() to avoid AuthSessionMissingError spam when logged out
  // Uses onAuthStateChange to react to auth changes instead of polling
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Use getSession() first - does NOT throw when logged out
        const { data: { session }, error } = await supabaseBrowser.auth.getSession();
        if (error) {
          // Only log unexpected errors, not normal logged-out state
          console.warn('[useBonusQuests] Unexpected session error:', error.message);
        }
        if (mounted) {
          // If no session, user is null - this is expected for logged-out users
          setCurrentUserId(session?.user?.id || null);
        }
      } catch (e) {
        // Unexpected exception - treat as logged out silently
        if (mounted) {
          setCurrentUserId(null);
        }
      }
    };

    initializeAuth();

    // Subscribe to auth state changes to update user ID reactively
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setCurrentUserId(session?.user?.id || null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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

  // Fetch quests when user ID changes (including initial null -> value or value -> null)
  // Note: We intentionally exclude fetchQuests from deps to avoid infinite loops
  // since fetchQuests is recreated when currentUserId changes
  useEffect(() => {
    // Fetch whether logged in or not
    fetchQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // Listen for quests:refresh event to refetch quests
  useEffect(() => {
    const handleRefresh = () => {
      console.log('[useBonusQuests] Received quests:refresh event');
      fetchQuests();
    };

    window.addEventListener('quests:refresh', handleRefresh);
    return () => {
      window.removeEventListener('quests:refresh', handleRefresh);
    };
  }, [fetchQuests]);

  // Complete a quest using the idempotent RPC
  // Returns a QuestCompletionResult with alreadyCompleted flag for UI handling
  // RPC signature: complete_bonus_quest_once_per_day({ p_quest_id })
  // Returns: { success: boolean, awarded: boolean, already_completed: boolean, error?: string }
  const completeQuest = useCallback(async (
    quest: BonusQuestWithCompletion
  ): Promise<QuestCompletionResult> => {
    if (!currentUserId) {
      console.log('[completeQuest] User not authenticated');
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    try {
      console.log('[completeQuest] Calling RPC complete_bonus_quest_once_per_day with p_quest_id:', quest.id);

      // Call the RPC (user is inferred from auth context)
      const { data, error, status: httpStatus } = await supabaseBrowser.rpc('complete_bonus_quest_once_per_day', {
        p_quest_id: quest.id
      });

      console.log('[completeQuest] RPC response:', { data, error, httpStatus });

      // Handle 404 - RPC function not found (backend updated, need refresh)
      if (error?.code === 'PGRST202' || error?.message?.includes('404') || error?.code === '42883') {
        console.error('[completeQuest] RPC 404 error:', error.code, error.message);
        return {
          success: false,
          message: 'Quest service updated, hard refresh'
        };
      }

      // Handle HTTP 409 conflict as already_completed (legacy backend compatibility)
      if (httpStatus === 409 || error?.code === '409') {
        console.log('[completeQuest] 409 conflict - treating as already completed');
        // Update local state immediately to show COMPLETED
        setQuests(prev => prev.map(q =>
          q.id === quest.id
            ? { ...q, can_complete: false, completed_today: 1 }
            : q
        ));
        // Refetch to confirm today's completions
        fetchQuests();
        return {
          success: true,
          alreadyCompleted: true,
          message: 'Already completed today'
        };
      }

      // Handle unique constraint violation (23505) as success - already completed (NOT an error)
      if (error?.code === '23505') {
        console.log('[completeQuest] 23505 unique constraint - treating as already completed');
        // Update local state immediately to show COMPLETED
        setQuests(prev => prev.map(q =>
          q.id === quest.id
            ? { ...q, can_complete: false, completed_today: 1 }
            : q
        ));
        return {
          success: true,
          alreadyCompleted: true,
          message: 'Already completed today'
        };
      }

      if (error) {
        console.error('[completeQuest] RPC error:', error.code, error.message, error.details);
        return {
          success: false,
          message: error.message || 'Quest failed. Try again.'
        };
      }

      // NEW response format: { success: boolean, awarded: boolean, already_completed: boolean, error?: string }
      const rpcSuccess = data?.success === true;
      const wasAwarded = data?.awarded === true;
      const alreadyCompleted = data?.already_completed === true;

      console.log('[completeQuest] Parsed RPC result:', { rpcSuccess, wasAwarded, alreadyCompleted });

      if (rpcSuccess) {
        // Immediately update local state so button flips to COMPLETED
        setQuests(prev => prev.map(q =>
          q.id === quest.id
            ? { ...q, can_complete: false, completed_today: 1, times_completed: q.times_completed + (wasAwarded ? 1 : 0) }
            : q
        ));

        // Only trigger celebration and refresh if coins were actually awarded
        if (wasAwarded) {
          console.log('[completeQuest] Coins awarded! Triggering celebration and refreshing profile');
          // Trigger the celebration animation + sound
          triggerHeartCoinCelebration(quest.reward_heartcoins > 0 ? quest.reward_heartcoins : 1);
          // Refresh profile to update displayed heartcoin_balance
          await refreshProfile();
        }

        if (alreadyCompleted) {
          console.log('[completeQuest] Already completed today');
          return {
            success: true,
            alreadyCompleted: true,
            message: 'Already completed today'
          };
        }

        // New completion with coins awarded
        return {
          success: true,
          alreadyCompleted: false,
          message: 'Quest completed successfully!',
          rewards: {
            heartcoins: quest.reward_heartcoins > 0 ? quest.reward_heartcoins : undefined,
            element_card: quest.reward_element_card ? true : undefined
          }
        };
      }

      // LEGACY response format fallback: { status: "completed" | "already_completed", awarded: boolean, ... }
      const responseStatus = data?.status;
      if (responseStatus === 'completed' || responseStatus === 'already_completed') {
        const isNewCompletion = responseStatus === 'completed' && data?.awarded === true;

        console.log('[completeQuest] Legacy format detected:', { responseStatus, isNewCompletion });

        // Immediately update local state so button flips to COMPLETED
        setQuests(prev => prev.map(q =>
          q.id === quest.id
            ? { ...q, can_complete: false, completed_today: 1, times_completed: q.times_completed + (isNewCompletion ? 1 : 0) }
            : q
        ));

        if (isNewCompletion) {
          console.log('[completeQuest] Legacy: Coins awarded! Triggering celebration');
          triggerHeartCoinCelebration(quest.reward_heartcoins > 0 ? quest.reward_heartcoins : 1);
          await refreshProfile();
        }

        if (responseStatus === 'already_completed') {
          return {
            success: true,
            alreadyCompleted: true,
            message: 'Already completed today'
          };
        }

        return {
          success: true,
          alreadyCompleted: false,
          message: 'Quest completed successfully!',
          rewards: {
            heartcoins: quest.reward_heartcoins > 0 ? quest.reward_heartcoins : undefined,
            element_card: quest.reward_element_card ? true : undefined
          }
        };
      }

      // LEGACY response format fallback #2: { ok: true, inserted: boolean, heartcoin_awarded: boolean }
      if (data?.ok === true) {
        const isNewCompletion = data?.inserted === true;
        const heartcoinAwarded = data?.heartcoin_awarded === true;

        console.log('[completeQuest] Legacy ok format:', { isNewCompletion, heartcoinAwarded });

        // Immediately update local state so button flips to COMPLETED
        setQuests(prev => prev.map(q =>
          q.id === quest.id
            ? { ...q, can_complete: false, completed_today: 1, times_completed: q.times_completed + (isNewCompletion ? 1 : 0) }
            : q
        ));

        if (heartcoinAwarded) {
          console.log('[completeQuest] Legacy ok: Coins awarded! Triggering celebration');
          triggerHeartCoinCelebration(quest.reward_heartcoins > 0 ? quest.reward_heartcoins : 1);
          await refreshProfile();
        }

        if (!isNewCompletion) {
          return {
            success: true,
            alreadyCompleted: true,
            message: 'Already completed today'
          };
        }

        return {
          success: true,
          alreadyCompleted: false,
          message: 'Quest completed successfully!',
          rewards: {
            heartcoins: quest.reward_heartcoins > 0 ? quest.reward_heartcoins : undefined,
            element_card: quest.reward_element_card ? true : undefined
          }
        };
      }

      // Check for error in response data
      if (data?.error) {
        console.error('[completeQuest] RPC returned error in data:', data.error);
        return {
          success: false,
          message: data.error
        };
      }

      // Unexpected response - log and treat as error
      console.error('[completeQuest] Unexpected response:', data);
      return {
        success: false,
        message: 'Quest failed. Try again.'
      };
    } catch (error: any) {
      // Catch 23505 error if thrown differently (graceful handling, not an error)
      if (error?.code === '23505' || error?.message?.includes('23505')) {
        console.log('[completeQuest] Caught 23505 exception - treating as already completed');
        setQuests(prev => prev.map(q =>
          q.id === quest.id
            ? { ...q, can_complete: false, completed_today: 1 }
            : q
        ));
        return {
          success: true,
          alreadyCompleted: true,
          message: 'Already completed today'
        };
      }

      // Handle 409 conflict in catch block as well
      if (error?.status === 409 || error?.message?.includes('409')) {
        console.log('[completeQuest] Caught 409 exception - treating as already completed');
        setQuests(prev => prev.map(q =>
          q.id === quest.id
            ? { ...q, can_complete: false, completed_today: 1 }
            : q
        ));
        fetchQuests();
        return {
          success: true,
          alreadyCompleted: true,
          message: 'Already completed today'
        };
      }

      console.error('[completeQuest] Exception:', error);
      return {
        success: false,
        message: 'Quest failed. Try again.'
      };
    }
  }, [currentUserId, refreshProfile, fetchQuests]);

  return {
    quests,
    status,
    errorMessage,
    isLoggedIn,
    refetchQuests: fetchQuests,
    completeQuest
  };
}
