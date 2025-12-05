import { supabaseClient } from '@/lib/supabaseClient';
import { BonusQuestRow, UserBonusQuestRow, BonusQuestWithCompletion, QuestCompletionResult } from '@/types/bonusQuests';
import { awardHeartCoins } from '@/utils/heartcoins';

/**
 * Fetches bonus quests, optionally overlaying completion for a user.
 * Always fetches public quests first (no auth required), then if a userId is
 * provided, fetches that user's completion rows to compute completion state.
 * Returns up to 3 quests: 1 rotating featured quest + 2 core quests.
 */
export async function getBonusQuestsForUser(userId?: string | null): Promise<BonusQuestWithCompletion[]> {
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

    // Fetch user's completion stats (only if a userId is present)
    let completions: Pick<UserBonusQuestRow, 'bonus_quest_id' | 'times_completed' | 'last_completed_at'>[] = [];
    if (userId) {
      const { data, error: completionsError } = await supabaseClient
        .from('user_bonus_quests')
        .select('bonus_quest_id, times_completed, last_completed_at')
        .eq('user_id', userId);

      if (completionsError) {
        console.error('Error fetching user completions:', completionsError);
        // Don't throw; continue without completions for public visibility
      } else {
        completions = data || [];
      }
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
    // Validate user authentication by checking if we can get current session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError) {
      console.error('Session validation error:', sessionError);
      return {
        success: false,
        message: 'Authentication required to complete quests'
      };
    }

    if (!session?.user) {
      return {
        success: false,
        message: 'Please sign up or log in to complete quests and earn Heart Coins'
      };
    }

    // Verify the provided userId matches the authenticated user
    if (session.user.id !== userId) {
      console.error('User ID mismatch:', { providedUserId: userId, sessionUserId: session.user.id });
      return {
        success: false,
        message: 'User authentication mismatch'
      };
    }

    // Check if user has already maxed out this quest
    if (quest.max_total_completions !== null && quest.times_completed >= quest.max_total_completions) {
      return {
        success: false,
        message: 'Quest already completed'
      };
    }

    // Check daily completion limit
    if (quest.max_times_per_day > 0) {
      // Get user's completion record to check last completion date
      const { data: userCompletion, error: completionCheckError } = await supabaseClient
        .from('user_bonus_quests')
        .select('last_completed_at')
        .eq('user_id', userId)
        .eq('bonus_quest_id', quest.id)
        .maybeSingle();

      if (completionCheckError) {
        console.error('Error checking quest completion:', completionCheckError);
        return {
          success: false,
          message: 'Error validating quest completion status'
        };
      }

      if (userCompletion?.last_completed_at) {
        const lastCompleted = new Date(userCompletion.last_completed_at);
        const today = new Date();
        const isToday = lastCompleted.toDateString() === today.toDateString();
        
        if (isToday) {
          return {
            success: false,
            message: 'You can only complete this quest once per day. Come back tomorrow!'
          };
        }
      }
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
      try {
        await awardHeartCoins(
          supabaseClient,
          userId,
          quest.reward_heartcoins,
          `Quest completed: ${quest.title}`,
          { quest_id: quest.id, quest_key: quest.quest_key }
        );
        rewards.heartcoins = quest.reward_heartcoins;
        onHeartCoinsAwarded?.(quest.reward_heartcoins);
        console.log(`✅ Awarded ${quest.reward_heartcoins} HeartCoins for completing quest: ${quest.title}`);
      } catch (heartCoinError) {
        console.error('Failed to award HeartCoins:', heartCoinError);
        return {
          success: false,
          message: 'Quest completed but failed to award HeartCoins. Please contact support.'
        };
      }
    }
    
    if (quest.reward_element_card) {
      rewards.element_card = true;
      onElementCardAwarded?.();
      // TODO: Implement actual element card awarding logic
      console.log('✅ Element card reward should be awarded');
    }


    // Also update the aggregated tracking table for quest stats
    const nowIso = new Date().toISOString();

    // Try to find an existing completion row
    const { data: existingRow, error: selectError } = await supabaseClient
      .from('user_bonus_quests')
      .select('id, times_completed')
      .eq('user_id', userId)
      .eq('bonus_quest_id', quest.id)
      .maybeSingle();

    if (selectError) {
      console.error('Error reading existing quest completion (raw):', selectError);
      console.error('Error reading existing quest completion (full):', JSON.stringify(selectError, null, 2));
      return {
        success: false,
        message: 'Failed to read quest completion state'
      };
    }

    if (existingRow) {
      // Update existing row (increment times_completed)
      const { error: updateError } = await supabaseClient
        .from('user_bonus_quests')
        .update({
          times_completed: (existingRow.times_completed ?? 0) + 1,
          last_completed_at: nowIso,
        })
        .eq('id', existingRow.id);

      if (updateError) {
        console.error('Error updating user quest completion (raw):', updateError);
        console.error('Error updating user quest completion (full):', JSON.stringify(updateError, null, 2));
        return {
          success: false,
          message: 'Failed to save quest completion'
        };
      }
    } else {
      // Insert new row
      const { error: insertError2 } = await supabaseClient
        .from('user_bonus_quests')
        .insert({
          user_id: userId,
          bonus_quest_id: quest.id,
          times_completed: 1,
          last_completed_at: nowIso,
        });

      if (insertError2) {
        console.error('Error inserting user quest completion (raw):', insertError2);
        console.error('Error inserting user quest completion (full):', JSON.stringify(insertError2, null, 2));
        
        // Handle unique constraint violation - user already has completion record
        if ((insertError2 as any)?.code === '23505') {
          console.log('User already has completion record, attempting update instead...');
          
          // Try to update instead
          const { error: updateError } = await supabaseClient
            .from('user_bonus_quests')
            .update({
              times_completed: (quest.times_completed || 0) + 1,
              last_completed_at: nowIso,
            })
            .eq('user_id', userId)
            .eq('bonus_quest_id', quest.id);

          if (updateError) {
            console.error('Error updating after failed insert:', updateError);
            return {
              success: false,
              message: 'Failed to save quest completion'
            };
          }
          
          console.log('Successfully updated completion record via fallback');
        } else {
          return {
            success: false,
            message: 'Failed to save quest completion'
          };
        }
      }
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
