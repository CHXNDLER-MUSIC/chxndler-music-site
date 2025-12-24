import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabaseClient';
import { BonusQuestRow, UserBonusQuestRow, BonusQuestWithCompletion, QuestCompletionResult } from '@/types/bonusQuests';
import { logHeartcoinTransaction } from '@/utils/heartcoins';

/**
 * Fetches ALL active bonus quests (without is_core filtering) for use in HeartCoinModal.
 * Splits quests by category (DAILY vs BONUS) and overlays completion state.
 * Returns { dailyQuests, bonusQuests } with completion data.
 */
export async function getAllQuestsForUser(userId?: string | null): Promise<{
  dailyQuests: BonusQuestWithCompletion[];
  bonusQuests: BonusQuestWithCompletion[];
  allQuests: BonusQuestWithCompletion[];
}> {
  try {
    // Fetch all active quests ordered by sort_order
    const { data: quests, error: questsError } = await supabaseClient
      .from('bonus_quests')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (questsError) {
      console.error('[getAllQuestsForUser] Error fetching quests:', questsError);
      return { dailyQuests: [], bonusQuests: [], allQuests: [] };
    }

    if (!quests || quests.length === 0) {
      console.log('[getAllQuestsForUser] No active quests found');
      return { dailyQuests: [], bonusQuests: [], allQuests: [] };
    }

    // Fetch user's completion stats (only if a userId is present)
    let completions: Pick<UserBonusQuestRow, 'bonus_quest_id' | 'times_completed' | 'last_completed_at'>[] = [];
    let todayCompletions: { bonus_quest_id: string }[] = [];

    if (userId) {
      // Fetch total completion counts
      const { data, error: completionsError } = await supabaseClient
        .from('user_bonus_quests')
        .select('bonus_quest_id, times_completed, last_completed_at')
        .eq('user_id', userId);

      if (completionsError) {
        console.error('[getAllQuestsForUser] Error fetching user completions:', completionsError);
      } else {
        completions = data || [];
      }

      // Fetch today's completions
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData, error: todayError } = await supabaseClient
        .from('user_bonus_quest_completions')
        .select('bonus_quest_id')
        .eq('user_id', userId)
        .gte('completed_at', `${today}T00:00:00Z`)
        .lt('completed_at', `${today}T23:59:59.999Z`);

      if (todayError) {
        console.error('[getAllQuestsForUser] Error fetching today\'s completions:', todayError);
      } else {
        todayCompletions = todayData || [];
      }
    }

    // Build completion maps
    const completionMap = new Map<string, { times_completed: number; last_completed_at: string | null }>();
    completions?.forEach(completion => {
      completionMap.set(completion.bonus_quest_id, {
        times_completed: completion.times_completed,
        last_completed_at: completion.last_completed_at
      });
    });

    const todayCompletionMap = new Set<string>();
    todayCompletions.forEach(completion => {
      todayCompletionMap.add(completion.bonus_quest_id);
    });

    // Transform all quests to include completion data
    const allQuestsWithCompletion: BonusQuestWithCompletion[] = quests.map(quest => {
      const completion = completionMap.get(quest.id);
      const timesCompleted = completion?.times_completed || 0;
      const completedToday = todayCompletionMap.has(quest.id) ? 1 : 0;

      const hasReachedDailyLimit = completedToday >= quest.max_times_per_day;
      const hasReachedTotalLimit = quest.max_total_completions !== null && timesCompleted >= quest.max_total_completions;
      const canComplete = !hasReachedDailyLimit && !hasReachedTotalLimit;

      return {
        ...quest,
        times_completed: timesCompleted,
        can_complete: canComplete,
        completed_today: completedToday
      };
    });

    // Split by category
    const dailyQuests = allQuestsWithCompletion.filter(q => q.category === 'DAILY');
    const bonusQuests = allQuestsWithCompletion.filter(q => q.category === 'BONUS');

    // Log summary (only once after fetch)
    console.log('[getAllQuestsForUser] Summary:', {
      totalQuests: allQuestsWithCompletion.length,
      dailyCount: dailyQuests.length,
      bonusCount: bonusQuests.length,
      questKeys: allQuestsWithCompletion.map(q => q.quest_key)
    });

    return { dailyQuests, bonusQuests, allQuests: allQuestsWithCompletion };

  } catch (error) {
    console.error('[getAllQuestsForUser] Error:', error);
    return { dailyQuests: [], bonusQuests: [], allQuests: [] };
  }
}

/**
 * Fetches bonus quests with a specific Supabase client (for server-side use).
 * Always fetches public quests first (no auth required), then if a userId is
 * provided, fetches that user's completion rows to compute completion state.
 * Returns up to 3 quests: 1 rotating featured quest + 2 core quests.
 */
export async function getBonusQuestsForUserWithClient(client: SupabaseClient, userId?: string | null): Promise<BonusQuestWithCompletion[]> {
  try {
    // Fetch all active bonus quests
    const { data: quests, error: questsError } = await client
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
    let todayCompletions: { bonus_quest_id: string }[] = [];

    if (userId) {
      // Fetch total completion counts
      const { data, error: completionsError } = await client
        .from('user_bonus_quests')
        .select('bonus_quest_id, times_completed, last_completed_at')
        .eq('user_id', userId);

      if (completionsError) {
        console.error('Error fetching user completions:', completionsError);
      } else {
        completions = data || [];
      }

      // Fetch today's completions using completed_at
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData, error: todayError } = await client
        .from('user_bonus_quest_completions')
        .select('bonus_quest_id')
        .eq('user_id', userId)
        .gte('completed_at', `${today}T00:00:00Z`)
        .lt('completed_at', `${today}T23:59:59.999Z`);

      if (todayError) {
        console.error('Error fetching today\'s completions:', todayError);
      } else {
        todayCompletions = todayData || [];
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

    // Build today's completion map
    const todayCompletionMap = new Set<string>();
    todayCompletions.forEach(completion => {
      todayCompletionMap.add(completion.bonus_quest_id);
    });

    // Filter out quests that user has reached max_total_completions
    const eligibleQuests = quests.filter(quest => {
      const completion = completionMap.get(quest.id);
      const timesCompleted = completion?.times_completed || 0;

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

      const completedToday = todayCompletionMap.has(quest.id) ? 1 : 0;

      const hasReachedDailyLimit = completedToday >= quest.max_times_per_day;
      const hasReachedTotalLimit = quest.max_total_completions !== null && timesCompleted >= quest.max_total_completions;
      const canComplete = !hasReachedDailyLimit && !hasReachedTotalLimit;

      return {
        ...quest,
        times_completed: timesCompleted,
        can_complete: canComplete,
        completed_today: completedToday
      };
    });

  } catch (error) {
    console.error('Error in getBonusQuestsForUserWithClient:', error);
    return [];
  }
}

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
    let todayCompletions: { bonus_quest_id: string }[] = [];
    
    if (userId) {
      // Fetch total completion counts
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
      
      // Fetch today's completions using completed_at
      const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
      const { data: todayData, error: todayError } = await supabaseClient
        .from('user_bonus_quest_completions')
        .select('bonus_quest_id')
        .eq('user_id', userId)
        .gte('completed_at', `${today}T00:00:00Z`)
        .lt('completed_at', `${today}T23:59:59.999Z`);
      
      if (todayError) {
        console.error('Error fetching today\'s completions:', todayError);
      } else {
        todayCompletions = todayData || [];
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
    
    // Build today's completion map
    const todayCompletionMap = new Set<string>();
    todayCompletions.forEach(completion => {
      todayCompletionMap.add(completion.bonus_quest_id);
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
      
      // Check if completed today using the new completions table
      const completedToday = todayCompletionMap.has(quest.id) ? 1 : 0;
      
      
      // Check if user can complete today
      const hasReachedDailyLimit = completedToday >= quest.max_times_per_day;
      const hasReachedTotalLimit = quest.max_total_completions !== null && timesCompleted >= quest.max_total_completions;
      const canComplete = !hasReachedDailyLimit && !hasReachedTotalLimit;
      
      
      return {
        ...quest,
        times_completed: timesCompleted,
        can_complete: canComplete,
        completed_today: completedToday
      };
    });

  } catch (error) {
    console.error('Error in getBonusQuestsForUser:', error);
    return [];
  }
}

/**
 * Completes a bonus quest for the user with proper tracking and rewards
 * Now uses user_bonus_quest_completions table for daily tracking
 */
export async function completeBonusQuest(params: {
  supabase: SupabaseClient;
  userId: string;
  bonusQuestId: string;
}): Promise<{ status: 'completed_today' | 'already_completed_today'; data?: any }> {
  const { supabase, userId, bonusQuestId } = params;

  if (!bonusQuestId) {
    console.error('completeBonusQuest: Missing bonusQuestId', { userId, bonusQuestId });
    throw new Error('bonusQuestId is required');
  }

  try {
    // Get the quest details to check reward_heartcoins
    const { data: quest, error: questError } = await supabase
      .from('bonus_quests')
      .select('*')
      .eq('id', bonusQuestId)
      .single();

    if (questError || !quest) {
      console.error('Failed to fetch quest details:', questError);
      throw new Error('Quest not found');
    }

    // Insert completion record into user_bonus_quest_completions
    // The database trigger will prevent duplicates for the same day
    const { data: insertData, error: insertError } = await supabase
      .from('user_bonus_quest_completions')
      .insert({
        user_id: userId,
        bonus_quest_id: bonusQuestId
        // completed_at will be set automatically by the trigger
      })
      .select()
      .single();

    if (insertError) {
      // Check if this is the "already completed today" error
      if (insertError.message && insertError.message.includes('Quest already completed today')) {
        console.log(`📋 Quest ${quest.quest_key} already completed today for user ${userId}`);
        return { status: 'already_completed_today' };
      }
      
      // Handle other errors
      console.error('Failed to insert quest completion:', insertError);
      throw new Error(`Failed to complete quest: ${insertError.message}`);
    }

    // Update the user_bonus_quests table for tracking total completions
    const { data: existingRecord } = await supabase
      .from('user_bonus_quests')
      .select('times_completed')
      .eq('user_id', userId)
      .eq('bonus_quest_id', bonusQuestId)
      .maybeSingle();

    if (existingRecord) {
      // Update existing record
      await supabase
        .from('user_bonus_quests')
        .update({
          times_completed: existingRecord.times_completed + 1,
          last_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('bonus_quest_id', bonusQuestId);
    } else {
      // Create new record
      await supabase
        .from('user_bonus_quests')
        .insert({
          user_id: userId,
          bonus_quest_id: bonusQuestId,
          times_completed: 1,
          last_completed_at: new Date().toISOString()
        });
    }

    // Award HeartCoins if quest has reward
    if (quest.reward_heartcoins && quest.reward_heartcoins > 0) {
      await logHeartcoinTransaction(supabase, {
        user_id: userId,
        amount: quest.reward_heartcoins,
        reason: 'BONUS_QUEST',
        description: `Bonus Quest: ${quest.title}`,
        transaction_type: 'bonus',
        metadata: { quest_id: quest.id }
      });
    }

    console.log(`✅ Quest ${quest.quest_key} completed successfully! +${quest.reward_heartcoins} HeartCoins awarded to user ${userId}`);

    return { status: 'completed_today', data: insertData };

  } catch (error) {
    console.error('Error in completeBonusQuest:', {
      userId,
      bonusQuestId,
      error
    });
    throw error;
  }
}

/**
 * @deprecated This function is DEPRECATED and should not be used.
 *
 * Secret phrase redemption now uses the `redeem_secret_phrase` RPC function
 * which handles all validation, redemption tracking, and coin awarding securely
 * on the database side. The secret_phrases table is locked down with RLS and
 * cannot be queried directly from the client.
 *
 * For frontend usage, call the RPC directly:
 *   supabase.rpc('redeem_secret_phrase', { p_phrase: trimmedPhrase })
 *
 * The RPC returns: { status, awarded, phrase_id }
 * Status values: 'success', 'already_redeemed', 'invalid', 'not_authenticated'
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function completeSecretPhraseQuest(_params: {
  supabase: SupabaseClient;
  userId: string;
  bonusQuestId: string;
  phrase: string;
}): Promise<void> {
  throw new Error(
    'completeSecretPhraseQuest is deprecated. Use the redeem_secret_phrase RPC directly.'
  );
}

/**
 * Completes a bonus quest with a specific Supabase client (for server-side use).
 * Returns a standardized result object.
 */
export async function completeBonusQuestWithClient(
  supabase: SupabaseClient,
  userId: string,
  quest: BonusQuestWithCompletion
): Promise<QuestCompletionResult> {
  try {
    const result = await completeBonusQuest({
      supabase,
      userId,
      bonusQuestId: quest.id
    });

    if (result.status === 'already_completed_today') {
      return {
        success: true,
        message: 'Quest already completed today!'
      };
    }

    return {
      success: true,
      message: 'Quest completed successfully!',
      rewards: {
        heartcoins: quest.reward_heartcoins > 0 ? quest.reward_heartcoins : undefined,
        element_card: quest.reward_element_card ? true : undefined
      }
    };

  } catch (error) {
    console.error('Error in completeBonusQuestWithClient:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred while completing the quest'
    };
  }
}

/**
 * Legacy function for backward compatibility - converts old signature to new
 */
export async function completeBonusQuestLegacy(
  userId: string,
  quest: BonusQuestWithCompletion,
  source?: string,
  onHeartCoinsAwarded?: (amount: number) => void,
  onElementCardAwarded?: () => void
): Promise<QuestCompletionResult> {
  try {
    // Use the new completeBonusQuest function
    const result = await completeBonusQuest({
      supabase: supabaseClient,
      userId,
      bonusQuestId: quest.id
    });

    if (result.status === 'already_completed_today') {
      return {
        success: true,
        message: 'Quest already completed today!'
      };
    }

    // Call optional callbacks only for new completions
    if (quest.reward_heartcoins > 0) {
      onHeartCoinsAwarded?.(quest.reward_heartcoins);
    }
    if (quest.reward_element_card) {
      onElementCardAwarded?.();
    }

    return {
      success: true,
      message: 'Quest completed successfully!',
      rewards: {
        heartcoins: quest.reward_heartcoins > 0 ? quest.reward_heartcoins : undefined,
        element_card: quest.reward_element_card ? true : undefined
      }
    };

  } catch (error) {
    console.error('Error in completeBonusQuestLegacy:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred while completing the quest'
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
