import { supabaseClient } from '@/lib/supabaseClient';
import { BonusQuestRow, UserBonusQuestRow, BonusQuestWithCompletion, QuestCompletionResult } from '@/types/bonusQuests';

/**
 * Fetches bonus quests for the current user, filtered by completion status
 * Returns up to 3 quests: 1 rotating featured quest + 2 core quests
 */
export async function getBonusQuestsForUser(userId: string): Promise<BonusQuestWithCompletion[]> {
  try {
    // Fetch all active bonus quests
    const { data: quests, error: questsError } = await supabaseClient
      .from('bonus_quests')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (questsError) {
      console.error('Error fetching bonus quests:', questsError);
      return [];
    }

    if (!quests || quests.length === 0) {
      return [];
    }

    // Fetch user's completion stats
    const { data: completions, error: completionsError } = await supabaseClient
      .from('user_bonus_quests')
      .select('bonus_quest_id, times_completed, last_completed_at')
      .eq('user_id', userId);

    if (completionsError) {
      console.error('Error fetching user completions:', completionsError);
      return [];
    }

    // Build completion map
    const completionMap = new Map<string, { times_completed: number; last_completed_at: string | null }>();
    completions?.forEach(completion => {
      completionMap.set(completion.bonus_quest_id, {
        times_completed: completion.times_completed,
        last_completed_at: completion.last_completed_at
      });
    });

    // Filter out quests that user has reached max_total_completions
    const eligibleQuests = quests.filter(quest => {
      const completion = completionMap.get(quest.id);
      const timesCompleted = completion?.times_completed || 0;
      
      // If max_total_completions is set and user has reached it, exclude quest
      if (quest.max_total_completions !== null && timesCompleted >= quest.max_total_completions) {
        return false;
      }
      
      return true;
    });

    // Separate core and non-core quests
    const coreQuests = eligibleQuests.filter(quest => quest.is_core);
    const nonCoreQuests = eligibleQuests.filter(quest => !quest.is_core);

    // Select rotating featured quest (first non-core by sort_order)
    const featuredQuest = nonCoreQuests.length > 0 ? nonCoreQuests[0] : null;

    // Build final quest list: [featured, core1, core2]
    const finalQuests: BonusQuestRow[] = [];
    
    if (featuredQuest) {
      finalQuests.push(featuredQuest);
    }
    
    // Add core quests (limited to 2)
    finalQuests.push(...coreQuests.slice(0, 2));

    // Transform to BonusQuestWithCompletion
    return finalQuests.map(quest => {
      const completion = completionMap.get(quest.id);
      const timesCompleted = completion?.times_completed || 0;
      
      // Check if user can complete today (simplified - just check total completions for now)
      const canComplete = quest.max_total_completions === null || timesCompleted < quest.max_total_completions;
      
      return {
        ...quest,
        times_completed: timesCompleted,
        can_complete: canComplete,
        completed_today: 0 // TODO: Implement daily tracking if needed
      };
    });

  } catch (error) {
    console.error('Error in getBonusQuestsForUser:', error);
    return [];
  }
}

/**
 * Completes a bonus quest for the user with proper tracking and rewards
 */
export async function completeBonusQuest(
  userId: string, 
  quest: BonusQuestWithCompletion,
  // Optional callbacks for existing reward systems
  onHeartCoinsAwarded?: (amount: number) => void,
  onElementCardAwarded?: () => void
): Promise<QuestCompletionResult> {
  try {
    // Check if user has already maxed out this quest
    if (quest.max_total_completions !== null && quest.times_completed >= quest.max_total_completions) {
      return {
        success: false,
        message: 'Quest already completed'
      };
    }

    // Special handling for LISTEN_ELEMENT_SONG
    if (quest.quest_key === 'LISTEN_ELEMENT_SONG') {
      // TODO: Verify user actually played their Elemental song
      // This could integrate with existing analytics/tracking system
      console.log('TODO: Verify user played elemental song');
      
      // TODO: Grant appropriate elemental card to user in Binder
      console.log('TODO: Grant elemental card to user');
    }

    // Award quest rewards
    const rewards: { heartcoins?: number; element_card?: boolean } = {};
    
    if (quest.reward_heartcoins > 0) {
      rewards.heartcoins = quest.reward_heartcoins;
      onHeartCoinsAwarded?.(quest.reward_heartcoins);
    }
    
    if (quest.reward_element_card) {
      rewards.element_card = true;
      onElementCardAwarded?.();
    }

    // Upsert user completion record
    const { error: upsertError } = await supabaseClient
      .from('user_bonus_quests')
      .upsert({
        user_id: userId,
        bonus_quest_id: quest.id,
        times_completed: quest.times_completed + 1,
        last_completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,bonus_quest_id'
      });

    if (upsertError) {
      console.error('Error updating user quest completion:', upsertError);
      return {
        success: false,
        message: 'Failed to save quest completion'
      };
    }

    return {
      success: true,
      message: 'Quest completed successfully!',
      rewards
    };

  } catch (error) {
    console.error('Error in completeBonusQuest:', error);
    return {
      success: false,
      message: 'An error occurred while completing the quest'
    };
  }
}

/**
 * Helper function to check if a quest can be completed by the user
 */
export function canCompleteQuest(quest: BonusQuestWithCompletion): boolean {
  // Check total completions limit
  if (quest.max_total_completions !== null && quest.times_completed >= quest.max_total_completions) {
    return false;
  }
  
  // TODO: Add daily completion check if needed
  // if (quest.max_times_per_day > 0 && quest.completed_today >= quest.max_times_per_day) {
  //   return false;
  // }
  
  return true;
}