import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabaseClient';
import { BonusQuestRow, UserBonusQuestRow, BonusQuestWithCompletion, QuestCompletionResult } from '@/types/bonusQuests';

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
      if (process.env.NODE_ENV !== "production") console.log('[getAllQuestsForUser] No active quests found');
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
        .eq('completed_date', today);

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
    if (process.env.NODE_ENV !== "production") {
      console.log('[getAllQuestsForUser] Summary:', {
        totalQuests: allQuestsWithCompletion.length,
        dailyCount: dailyQuests.length,
        bonusCount: bonusQuests.length,
        questKeys: allQuestsWithCompletion.map(q => q.quest_key)
      });
    }

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

      // Fetch today's completions using completed_date
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData, error: todayError } = await client
        .from('user_bonus_quest_completions')
        .select('bonus_quest_id')
        .eq('user_id', userId)
        .eq('completed_date', today);

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
      
      // Fetch today's completions using completed_date
      const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
      const { data: todayData, error: todayError } = await supabaseClient
        .from('user_bonus_quest_completions')
        .select('bonus_quest_id')
        .eq('user_id', userId)
        .eq('completed_date', today);
      
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
 * Normalized response type for bonus quest completion
 */
export interface BonusQuestCompletionResult {
  status: 'completed' | 'already_completed';
  awarded: boolean;
  amount: number;
  data?: any;
}

/**
 * Completes a bonus quest for the user with proper tracking and rewards
 * Uses complete_bonus_quest_once_per_day RPC for atomic daily tracking
 *
 * RPC signature: complete_bonus_quest_once_per_day({ p_quest_id })
 * User is inferred from auth context.
 * Returns: { status: "completed" | "already_completed", awarded: boolean, completion_date_ny: "YYYY-MM-DD", heartcoin_balance: number }
 *
 * IMPORTANT: This is the ONLY function that should be used for bonus quest completion.
 * All other legacy functions are deprecated.
 */
export async function completeBonusQuestOncePerDay(params: {
  userId: string;
  bonusQuestId: string;
  supabase?: SupabaseClient;
}): Promise<BonusQuestCompletionResult> {
  const { bonusQuestId, supabase = supabaseClient } = params;

  if (!bonusQuestId) {
    throw new Error('bonusQuestId is required');
  }

  try {
    // Call RPC (user inferred from auth context)
    const { data: rpcResult, error: rpcError, status } = await supabase
      .rpc('complete_bonus_quest_once_per_day', {
        p_quest_id: bonusQuestId
      });

    // Handle 404 - RPC function not found (backend updated, need refresh)
    if (rpcError?.code === 'PGRST202' || rpcError?.message?.includes('404') || rpcError?.code === '42883') {
      throw new Error('Quest service updated, hard refresh');
    }

    // Handle HTTP 409 conflict as already_completed
    if (status === 409 || rpcError?.code === '409') {
      return { status: 'already_completed', awarded: false, amount: 0 };
    }

    // Handle unique constraint violation (23505) as "already_completed" - NOT an error
    if (rpcError?.code === '23505') {
      return { status: 'already_completed', awarded: false, amount: 0 };
    }

    if (rpcError) {
      console.error('[completeBonusQuestOncePerDay] RPC error:', rpcError.code, rpcError.message);
      throw new Error('Quest failed. Try again.');
    }

    // New response format: { status: "completed" | "already_completed", awarded: boolean, completion_date_ny: "YYYY-MM-DD", heartcoin_balance: number }
    const responseStatus = rpcResult?.status;
    const wasAwarded = rpcResult?.awarded === true;

    // Both "completed" and "already_completed" are success states
    if (responseStatus === 'completed' || responseStatus === 'already_completed') {
      return {
        status: responseStatus,
        awarded: wasAwarded,
        amount: wasAwarded ? 1 : 0,
        data: rpcResult
      };
    }

    // Legacy response format fallback: { ok, quest_id, completed_on_date, inserted, heartcoin_awarded }
    if (rpcResult?.ok === true) {
      const isNewCompletion = rpcResult?.inserted === true;
      const heartcoinAwarded = rpcResult?.heartcoin_awarded === true;

      if (!isNewCompletion) {
        return { status: 'already_completed', awarded: false, amount: 0, data: rpcResult };
      }

      return {
        status: 'completed',
        awarded: heartcoinAwarded,
        amount: heartcoinAwarded ? 1 : 0,
        data: rpcResult
      };
    }

    // Unexpected response
    console.error('[completeBonusQuestOncePerDay] Unexpected response:', rpcResult);
    throw new Error('Quest failed. Try again.');

  } catch (error: any) {
    // Catch 23505 error if thrown differently
    if (error?.code === '23505' || error?.message?.includes('23505')) {
      return { status: 'already_completed', awarded: false, amount: 0 };
    }

    // Handle 409 conflict in catch block as well
    if (error?.status === 409 || error?.message?.includes('409')) {
      return { status: 'already_completed', awarded: false, amount: 0 };
    }

    // Re-throw with clean message
    throw error;
  }
}

/**
 * @deprecated Use completeBonusQuestOncePerDay instead
 * Alias for backward compatibility
 */
export async function completeBonusQuest(params: {
  supabase: SupabaseClient;
  userId: string;
  bonusQuestId: string;
}): Promise<{ status: 'completed' | 'already_completed'; awarded: boolean; data?: any }> {
  const result = await completeBonusQuestOncePerDay({
    userId: params.userId,
    bonusQuestId: params.bonusQuestId,
    supabase: params.supabase
  });
  return {
    status: result.status,
    awarded: result.awarded,
    data: result.data
  };
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

    if (result.status === 'already_completed') {
      return {
        success: true,
        message: 'Quest already completed today!'
      };
    }

    return {
      success: true,
      message: 'Quest completed successfully!',
      rewards: {
        heartcoins: result.awarded && quest.reward_heartcoins > 0 ? quest.reward_heartcoins : undefined,
        element_card: result.awarded && quest.reward_element_card ? true : undefined
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

    if (result.status === 'already_completed') {
      // Still mark as success but no rewards
      return {
        success: true,
        message: 'Quest already completed today!'
      };
    }

    // Call optional callbacks only for NEW completions (awarded === true)
    if (result.awarded) {
      if (quest.reward_heartcoins > 0) {
        onHeartCoinsAwarded?.(quest.reward_heartcoins);
      }
      if (quest.reward_element_card) {
        onElementCardAwarded?.();
      }
    }

    return {
      success: true,
      message: 'Quest completed successfully!',
      rewards: result.awarded ? {
        heartcoins: quest.reward_heartcoins > 0 ? quest.reward_heartcoins : undefined,
        element_card: quest.reward_element_card ? true : undefined
      } : undefined
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
