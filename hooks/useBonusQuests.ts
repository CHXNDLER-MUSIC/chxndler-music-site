import { useState, useEffect, useCallback } from 'react';
import { BonusQuestWithCompletion, QuestCompletionResult } from '@/types/bonusQuests';
import { completeBonusQuestLegacy } from '@/lib/bonusQuests';
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

  // Complete a quest
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
      const result = await completeBonusQuestLegacy(
        currentUserId,
        quest,
        undefined, // source
        // TODO: Wire up existing heart coins handler
        (amount: number) => {
          console.log(`Awarded ${amount} heart coins`);
          // This should call your existing heart coins update function
        },
        // TODO: Wire up existing element card handler
        () => {
          console.log('Awarded element card');
          // This should call your existing element card award function
        }
      );

      // If quest was completed successfully, refetch quests and refresh profile to update HeartCoin balance
      if (result.success) {
        await Promise.all([
          fetchQuests(),
          refreshProfile() // Refresh profile to update HeartCoin balance in UI
        ]);
      }

      return result;
    } catch (error) {
      console.error('Error completing quest:', error);
      return {
        success: false,
        message: 'An error occurred while completing the quest'
      };
    }
  }, [currentUserId, fetchQuests]);

  return {
    quests,
    status,
    errorMessage,
    isLoggedIn,
    refetchQuests: fetchQuests,
    completeQuest
  };
}
