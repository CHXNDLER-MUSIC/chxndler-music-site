import { useState, useEffect, useCallback } from 'react';
import { BonusQuestWithCompletion, QuestCompletionResult } from '@/types/bonusQuests';
import { getBonusQuestsForUser, completeBonusQuest } from '@/lib/bonusQuests';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface UseBonusQuestsReturn {
  bonusQuests: BonusQuestWithCompletion[];
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  refetchQuests: () => Promise<void>;
  completeQuest: (quest: BonusQuestWithCompletion) => Promise<QuestCompletionResult>;
}

/**
 * Hook for managing bonus quests in the Heart Coins modal
 * Handles fetching, caching, and completion of bonus quests for the current user
 */
export function useBonusQuests(): UseBonusQuestsReturn {
  const [bonusQuests, setBonusQuests] = useState<BonusQuestWithCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isLoggedIn = !!currentUserId;

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
    setLoading(true);
    setError(null);

    try {
      // Always fetch public quests; overlay completion if user exists
      const quests = await getBonusQuestsForUser(currentUserId);
      setBonusQuests(quests);
    } catch (error) {
      console.error('Error fetching bonus quests:', error);
      setError('Failed to load bonus quests');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

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
      const result = await completeBonusQuest(
        currentUserId,
        quest,
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

      // If quest was completed successfully, refetch quests to update UI
      if (result.success) {
        await fetchQuests();
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
    bonusQuests,
    loading,
    error,
    isLoggedIn,
    refetchQuests: fetchQuests,
    completeQuest
  };
}
