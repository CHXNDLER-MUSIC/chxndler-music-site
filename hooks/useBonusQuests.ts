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
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabaseBrowser.auth.getSession();
        if (error) {
          console.warn('[useBonusQuests] Unexpected session error:', error.message);
        }
        if (mounted) {
          setCurrentUserId(session?.user?.id || null);
        }
      } catch (e) {
        if (mounted) {
          setCurrentUserId(null);
        }
      }
    };

    initializeAuth();

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
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

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

  // Fetch quests when user ID changes
  useEffect(() => {
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

  // Complete a quest using the RPC
  // RPC: complete_bonus_quest_once_per_day({ p_quest_id })
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

    console.log('[completeQuest] Calling RPC complete_bonus_quest_once_per_day with p_quest_id:', quest.id);

    try {
      const { data, error } = await supabaseBrowser.rpc('complete_bonus_quest_once_per_day', {
        p_quest_id: quest.id
      });

      console.log('[completeQuest] RPC response:', { data, error });

      // Handle RPC error (network error, function not found, etc.)
      if (error) {
        console.error('[completeQuest] RPC error:', {
          message: error.message,
          code: (error as any)?.code,
          details: (error as any)?.details,
          hint: (error as any)?.hint
        });

        // Show toast for user feedback
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('toast:show', {
            detail: { message: 'Quest failed. Please try again.', type: 'error' }
          }));
        }

        return {
          success: false,
          message: error.message || 'Quest failed. Try again.'
        };
      }

      // Check for error in response data
      if (data?.error) {
        console.error('[completeQuest] RPC returned error in data:', data.error);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('toast:show', {
            detail: { message: data.error, type: 'error' }
          }));
        }

        return {
          success: false,
          message: data.error
        };
      }

      // Check success flag from response
      if (data?.success !== true) {
        console.error('[completeQuest] RPC returned success=false:', data);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('toast:show', {
            detail: { message: 'Quest failed. Please try again.', type: 'error' }
          }));
        }

        return {
          success: false,
          message: 'Quest failed. Try again.'
        };
      }

      // SUCCESS PATH: data.success === true
      const wasAwarded = data?.awarded === true;
      const alreadyCompleted = data?.already_completed === true;

      console.log('[completeQuest] Success! awarded:', wasAwarded, 'already_completed:', alreadyCompleted);

      // Update local state immediately so button flips to COMPLETED
      setQuests(prev => prev.map(q =>
        q.id === quest.id
          ? { ...q, can_complete: false, completed_today: 1, times_completed: q.times_completed + (wasAwarded ? 1 : 0) }
          : q
      ));

      // Handle already_completed case
      if (alreadyCompleted) {
        console.log('[completeQuest] Already completed today - no celebration');

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('toast:show', {
            detail: { message: 'Already completed today', type: 'info' }
          }));
        }

        return {
          success: true,
          alreadyCompleted: true,
          message: 'Already completed today'
        };
      }

      // Handle awarded case - trigger celebration and refresh profile
      if (wasAwarded) {
        console.log('[completeQuest] Coins awarded! Triggering celebration and refreshing profile');

        // Trigger the celebration animation + sound
        const rewardAmount = quest.reward_heartcoins > 0 ? quest.reward_heartcoins : 1;
        triggerHeartCoinCelebration(rewardAmount);

        // Refresh profile to update displayed heartcoin_balance
        try {
          await refreshProfile();
          console.log('[completeQuest] Profile refreshed successfully');
        } catch (refreshErr) {
          console.warn('[completeQuest] Profile refresh failed:', refreshErr);
        }

        // Dispatch events for other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('profile:force-refresh'));
          window.dispatchEvent(new CustomEvent('quests:refresh'));
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

      // Fallback: success but neither awarded nor already_completed explicitly set
      console.log('[completeQuest] Success but no explicit awarded/already_completed flags');
      return {
        success: true,
        alreadyCompleted: false,
        message: 'Quest completed!'
      };

    } catch (err: any) {
      console.error('[completeQuest] Exception:', err);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('toast:show', {
          detail: { message: 'Quest failed. Please try again.', type: 'error' }
        }));
      }

      return {
        success: false,
        message: 'Quest failed. Try again.'
      };
    }
  }, [currentUserId, refreshProfile]);

  return {
    quests,
    status,
    errorMessage,
    isLoggedIn,
    refetchQuests: fetchQuests,
    completeQuest
  };
}
