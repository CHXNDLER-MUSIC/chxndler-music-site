import { useState, useEffect, useCallback } from 'react';
import { BonusQuestWithCompletion, QuestCompletionResult } from '@/types/bonusQuests';
import { getBonusQuestsForUser, completeBonusQuest } from '@/lib/bonusQuests';
import { supabaseClient } from '@/lib/supabaseClient';

interface UseBonusQuestsReturn {
  bonusQuests: BonusQuestWithCompletion[];
  loading: boolean;
  error: string | null;
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

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error) {
          console.error('Error getting current user:', error);
          setError('Failed to get current user');
          return;
        }
        setCurrentUserId(user?.id || null);
      } catch (error) {
        console.error('Error in getCurrentUser:', error);
        setError('Failed to authenticate user');
      }
    };

    getCurrentUser();
  }, []);

  // Fetch bonus quests for the current user
  const fetchQuests = useCallback(async () => {
    if (!currentUserId) {
      setBonusQuests([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
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
    if (currentUserId) {
      fetchQuests();
    }
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
    refetchQuests: fetchQuests,
    completeQuest
  };
}