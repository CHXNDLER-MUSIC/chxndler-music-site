import { useState, useEffect, useCallback } from 'react';
import { BonusQuestWithCompletion, QuestCompletionResult } from '@/types/bonusQuests';
import { getBonusQuestsForUser, completeBonusQuest } from '@/lib/bonusQuests';
import { supabaseClient } from '@/lib/supabaseClient';

interface UseBonusQuestsReturn {
  bonusQuests: BonusQuestWithCompletion[];
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  refetchQuests: () => Promise<void>;
  completeQuest: (quest: BonusQuestWithCompletion) => Promise<QuestCompletionResult>;
  questStatus: Record<string, 'pending' | 'completed' | 'error'>;
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
  const [questStatus, setQuestStatus] = useState<Record<string, 'pending' | 'completed' | 'error'>>({});
  const isLoggedIn = !!currentUserId;

  // Get current user (safe: don't error if not logged in)
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
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
      const result = await completeBonusQuest(quest.quest_key, currentUserId);

      // Update quest status based on result
      if (result.success) {
        setQuestStatus(prev => ({
          ...prev,
          [quest.quest_key]: 'completed',
        }));

        // Update local state to mark quest as completed
        setBonusQuests(currentQuests => 
          currentQuests.map(q => 
            q.id === quest.id 
              ? { 
                  ...q, 
                  times_completed: (q.times_completed || 0) + 1,
                  can_complete: q.max_total_completions === null || 
                    (q.times_completed + 1) < q.max_total_completions
                }
              : q
          )
        );

        // Also refetch to ensure server state is in sync
        await fetchQuests();
      } else {
        setQuestStatus(prev => ({
          ...prev,
          [quest.quest_key]: 'error',
        }));
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
    completeQuest,
    questStatus
  };
}
