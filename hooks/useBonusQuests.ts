import { useState, useEffect, useCallback } from 'react';
import { BonusQuestWithCompletion, QuestCompletionResult } from '@/types/bonusQuests';
import { getBonusQuestsForUser, completeBonusQuestLegacy } from '@/lib/bonusQuests';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useProfile } from '@/contexts/ProfileContext';

interface UseBonusQuestsReturn {
  quests: BonusQuestWithCompletion[];
  status: "idle" | "loading" | "success" | "error";
  errorMessage: string | null;
  isLoggedIn: boolean;
  refetchQuests: () => Promise<void>;
  completeQuest: (quest: BonusQuestWithCompletion) => Promise<QuestCompletionResult>;
}

/**
 * Hook for managing bonus quests in the Heart Coins modal
 * Handles fetching, caching, and completion of bonus quests for the current user
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
      // Add timeout to prevent infinite loading (increased from 8s to 15s)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );
      
      // Add retry logic for network issues
      const fetchWithRetry = async (retries = 2): Promise<any> => {
        for (let i = 0; i <= retries; i++) {
          try {
            return await getBonusQuestsForUser(currentUserId);
          } catch (err) {
            if (i === retries) throw err;
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
          }
        }
      };
      
      // Always fetch public quests; overlay completion if user exists
      const questsData = await Promise.race([
        fetchWithRetry(),
        timeoutPromise
      ]);
      
      setQuests(questsData);
      setStatus("success");
      setHasLoggedError(false); // Reset error logging flag on success
    } catch (error) {
      // Only log error once per mount to prevent console spam
      if (!hasLoggedError) {
        console.error('Error fetching bonus quests:', error);
        setHasLoggedError(true);
      }
      
      setStatus("error");
      // Use fallback error message to reduce noise
      const errorMessage = error instanceof Error && error.message === 'Request timeout' 
        ? 'Network timeout - please check your connection and try again'
        : 'Bonus quests temporarily unavailable';
      setErrorMessage(errorMessage);
      // Set empty array as fallback so UI continues to work
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
