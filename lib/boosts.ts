/**
 * Boost consumption helper for database-driven boosts
 *
 * Uses the public.consume_active_boost RPC to atomically consume boosts
 * and prevent double-consumption via event_id idempotency.
 */

import { supabaseBrowser } from '@/lib/supabase-browser';

export type BoostScope = 'listen_rewards' | 'journal_rewards' | 'streak_rewards';

export interface ConsumeBoostResult {
  multiplier: number;
  addAmount: number;
  didConsume: boolean;
  usesRemaining: number;
  boostId: string | null;
  boostKey: string | null;
}

/**
 * Attempt to consume an active boost for a given scope.
 *
 * @param scope - The boost scope: 'listen_rewards', 'journal_rewards', or 'streak_rewards'
 * @param eventId - A stable, unique event ID to prevent double consumption
 *                  Examples:
 *                  - listen_reward:${userId}:${songId}:${dateKey}
 *                  - journal_reward:${journalEntryId}
 *                  - streak_break:${userId}:${dateKey}
 *
 * @returns ConsumeBoostResult with multiplier/addAmount applied if didConsume is true
 */
export async function consumeBoost(
  scope: BoostScope,
  eventId: string
): Promise<ConsumeBoostResult> {
  try {
    const { data, error } = await supabaseBrowser.rpc('consume_active_boost', {
      p_scope: scope,
      p_event_id: eventId
    });

    if (error) {
      console.warn(`[consumeBoost] RPC error for scope=${scope}:`, error.message);
      // Return no-boost result on error
      return {
        multiplier: 1,
        addAmount: 0,
        didConsume: false,
        usesRemaining: 0,
        boostId: null,
        boostKey: null
      };
    }

    // Handle case where RPC returns null or no boost available
    if (!data || !data.did_consume) {
      return {
        multiplier: 1,
        addAmount: 0,
        didConsume: false,
        usesRemaining: data?.uses_remaining ?? 0,
        boostId: data?.boost_id ?? null,
        boostKey: data?.boost_key ?? null
      };
    }

    // Boost was consumed successfully
    console.log(`[consumeBoost] Consumed boost for scope=${scope}, eventId=${eventId}:`, {
      boostKey: data.boost_key,
      multiplier: data.multiplier,
      addAmount: data.add_amount,
      usesRemaining: data.uses_remaining
    });

    return {
      multiplier: data.multiplier ?? 1,
      addAmount: data.add_amount ?? 0,
      didConsume: true,
      usesRemaining: data.uses_remaining ?? 0,
      boostId: data.boost_id ?? null,
      boostKey: data.boost_key ?? null
    };
  } catch (err) {
    console.error(`[consumeBoost] Unexpected error for scope=${scope}:`, err);
    return {
      multiplier: 1,
      addAmount: 0,
      didConsume: false,
      usesRemaining: 0,
      boostId: null,
      boostKey: null
    };
  }
}

/**
 * Fetch active boosts for the current user from user_active_boosts table.
 *
 * Returns boosts that are:
 * - Active (now between starts_at and expires_at, or expires_at is null)
 * - Have uses_remaining > 0
 *
 * Groups by boost_key/scope and picks the max uses_remaining for display.
 */
export interface ActiveBoost {
  boostKey: string;
  scope: BoostScope;
  name: string;
  effect: string;
  usesLeft: number;
  multiplier: number;
  addAmount: number;
}

const BOOST_DISPLAY_INFO: Record<string, { name: string; effect: string }> = {
  'deep_focus': { name: 'Deep Focus', effect: '2× Listen Rewards' },
  'reflection_boost': { name: 'Reflection Boost', effect: '2× Journal Rewards' },
  'streak_shield': { name: 'Streak Shield', effect: '+1 Streak Rewards' },
};

const SCOPE_TO_BOOST_KEY: Record<BoostScope, string> = {
  'listen_rewards': 'deep_focus',
  'journal_rewards': 'reflection_boost',
  'streak_rewards': 'streak_shield',
};

export async function fetchActiveBoosts(userId: string): Promise<ActiveBoost[]> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabaseBrowser
      .from('user_active_boosts')
      .select('boost_key, scope, multiplier, add_amount, uses_remaining')
      .eq('user_id', userId)
      .gt('uses_remaining', 0)
      .lte('starts_at', now)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    if (error) {
      console.warn('[fetchActiveBoosts] Error fetching boosts:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Group by scope and pick the one with max uses_remaining
    const boostsByScope = new Map<string, typeof data[0]>();

    for (const boost of data) {
      const existing = boostsByScope.get(boost.scope);
      if (!existing || boost.uses_remaining > existing.uses_remaining) {
        boostsByScope.set(boost.scope, boost);
      }
    }

    return Array.from(boostsByScope.values()).map(boost => {
      const displayInfo = BOOST_DISPLAY_INFO[boost.boost_key] || {
        name: boost.boost_key,
        effect: boost.multiplier > 1 ? `${boost.multiplier}× Rewards` : `+${boost.add_amount} Rewards`
      };

      return {
        boostKey: boost.boost_key,
        scope: boost.scope as BoostScope,
        name: displayInfo.name,
        effect: displayInfo.effect,
        usesLeft: boost.uses_remaining,
        multiplier: boost.multiplier ?? 1,
        addAmount: boost.add_amount ?? 0
      };
    });
  } catch (err) {
    console.error('[fetchActiveBoosts] Unexpected error:', err);
    return [];
  }
}
