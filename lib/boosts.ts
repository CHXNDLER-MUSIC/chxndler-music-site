/**
 * Boost consumption helper for database-driven boosts
 *
 * Uses the public.consume_boost_once RPC to atomically consume boosts.
 * Boosts are 1-time use (uses_total=1, uses_remaining starts at 1, decrements to 0 when used).
 *
 * Canonical boost keys (use these when calling consume_active_boost):
 * - boost_listening: Applied when a song listen is recorded
 * - boost_reflection: Applied after journal/reflection submission
 * - boost_streak_shield: Prevents streak from breaking
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

export interface ActiveBoostCheck {
  exists: boolean;
  boostKey: string | null;
  scope: BoostScope | null;
  multiplier: number;
  addAmount: number;
  usesRemaining: number;
}

// Mapping from scope to boost key for legacy compatibility
const SCOPE_TO_BOOST_KEY: Record<BoostScope, string> = {
  'listen_rewards': 'deep_focus',
  'journal_rewards': 'reflection_boost',
  'streak_rewards': 'streak_shield',
};

/**
 * Check if an active boost exists for the given boost_key and scope.
 * Does NOT consume the boost - use consumeBoostOnce for that.
 *
 * @param boostKey - The boost key (e.g., 'deep_focus', 'reflection_boost', 'streak_shield')
 * @param scope - The boost scope: 'listen_rewards', 'journal_rewards', or 'streak_rewards'
 * @param source - Optional source filter (e.g., 'planet_click', 'relic')
 */
export async function checkActiveBoost(
  boostKey: string,
  scope: BoostScope,
  source?: string
): Promise<ActiveBoostCheck> {
  try {
    const now = new Date().toISOString();

    let query = supabaseBrowser
      .from('user_active_boosts')
      .select('boost_key, scope, multiplier, add_amount, uses_remaining')
      .eq('boost_key', boostKey)
      .eq('scope', scope)
      .gt('uses_remaining', 0)
      .lte('starts_at', now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .limit(1);

    if (source) {
      query = query.eq('source', source);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return {
        exists: false,
        boostKey: null,
        scope: null,
        multiplier: 1,
        addAmount: 0,
        usesRemaining: 0
      };
    }

    return {
      exists: true,
      boostKey: data.boost_key,
      scope: data.scope as BoostScope,
      multiplier: data.multiplier ?? 1,
      addAmount: data.add_amount ?? 0,
      usesRemaining: data.uses_remaining
    };
  } catch (err) {
    console.error(`[checkActiveBoost] Error for boostKey=${boostKey}, scope=${scope}:`, err);
    return {
      exists: false,
      boostKey: null,
      scope: null,
      multiplier: 1,
      addAmount: 0,
      usesRemaining: 0
    };
  }
}

/**
 * Atomically consume a boost using the consume_boost_once RPC.
 * Only apply the boost effect if didConsume === true.
 *
 * @param boostKey - The boost key (e.g., 'deep_focus', 'reflection_boost', 'streak_shield')
 * @param scope - The boost scope: 'listen_rewards', 'journal_rewards', or 'streak_rewards'
 * @param source - Optional source filter (e.g., 'planet_click', 'relic')
 *
 * @returns ConsumeBoostResult with multiplier/addAmount applied if didConsume is true
 */
export async function consumeBoostOnce(
  boostKey: string,
  scope: BoostScope,
  source?: string
): Promise<ConsumeBoostResult> {
  try {
    const { data, error } = await supabaseBrowser.rpc('consume_boost_once', {
      p_boost_key: boostKey,
      p_scope: scope,
      p_source: source ?? null
    });

    if (error) {
      if (process.env.NODE_ENV !== "production") console.warn(`[consumeBoostOnce] RPC error for boostKey=${boostKey}, scope=${scope}:`, error.message);
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
    if (process.env.NODE_ENV !== "production") {
      console.log(`[consumeBoostOnce] Consumed boost boostKey=${boostKey}, scope=${scope}:`, {
        multiplier: data.multiplier,
        addAmount: data.add_amount,
        usesRemaining: data.uses_remaining
      });
    }

    return {
      multiplier: data.multiplier ?? 1,
      addAmount: data.add_amount ?? 0,
      didConsume: true,
      usesRemaining: data.uses_remaining ?? 0,
      boostId: data.boost_id ?? null,
      boostKey: data.boost_key ?? null
    };
  } catch (err) {
    console.error(`[consumeBoostOnce] Unexpected error for boostKey=${boostKey}, scope=${scope}:`, err);
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
 * Legacy wrapper for backward compatibility.
 * Maps scope to boost_key and calls consumeBoostOnce.
 *
 * @deprecated Use consumeBoostOnce directly with explicit boost_key
 */
export async function consumeBoost(
  scope: BoostScope,
  _eventId: string
): Promise<ConsumeBoostResult> {
  const boostKey = SCOPE_TO_BOOST_KEY[scope];
  return consumeBoostOnce(boostKey, scope);
}

/**
 * Consume an active boost using the consume_active_boost RPC.
 * This is the canonical way to consume boosts in the system.
 *
 * @param userId - The user's ID
 * @param boostKey - One of: 'boost_listening', 'boost_reflection', 'boost_streak_shield'
 * @returns boolean - true if a boost was consumed, false otherwise
 */
export async function consumeActiveBoost(
  userId: string,
  boostKey: 'boost_listening' | 'boost_reflection' | 'boost_streak_shield'
): Promise<boolean> {
  try {
    const { data, error } = await supabaseBrowser.rpc('consume_active_boost', {
      p_user_id: userId,
      p_boost_key: boostKey
    });

    if (error) {
      if (process.env.NODE_ENV !== "production") console.warn(`[consumeActiveBoost] RPC error for boostKey=${boostKey}:`, error.message);
      return false;
    }

    const consumed = data === true;

    if (consumed) {
      if (process.env.NODE_ENV !== "production") console.log(`[consumeActiveBoost] Successfully consumed boost: ${boostKey}`);
      // Dispatch event to refresh boosts in UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('boosts:refresh'));
      }
    }

    return consumed;
  } catch (err) {
    console.error(`[consumeActiveBoost] Unexpected error for boostKey=${boostKey}:`, err);
    return false;
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
  scope: string;
  name: string;
  effect: string;
  usesLeft: number | null;
  expiresAt: string | null;
  multiplier: number;
  addAmount: number;
}

const BOOST_DISPLAY_INFO: Record<string, { name: string; effect: string }> = {
  'deep_focus': { name: 'Deep Focus', effect: '2× Listen Rewards' },
  'reflection_boost': { name: 'Reflection Boost', effect: '2× Journal Rewards' },
  'streak_shield': { name: 'Streak Shield', effect: 'Protects Streak' },
  'journal_2x': { name: '2× Journal', effect: '2× Journal Rewards' },
  'heartcoins_2x': { name: '2× HeartCoins', effect: '2× HeartCoin Rewards' },
  'binder_slot': { name: '+1 Binder Slot', effect: 'Extra Binder Slot' },
};

/**
 * Prettify a boost_key into a friendly name.
 * e.g. "streak_shield" -> "Streak Shield"
 */
function prettifyBoostKey(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function fetchActiveBoosts(userId: string): Promise<ActiveBoost[]> {
  try {
    const now = new Date().toISOString();

    // Query active boosts:
    // - expires_at is null OR expires_at > now
    // - uses_remaining is null OR uses_remaining > 0
    const { data, error } = await supabaseBrowser
      .from('user_active_boosts')
      .select('boost_key, scope, multiplier, add_amount, uses_remaining, expires_at')
      .eq('user_id', userId)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .or('uses_remaining.is.null,uses_remaining.gt.0')
      .order('starts_at', { ascending: false });

    if (error) {
      if (process.env.NODE_ENV !== "production") console.warn('[fetchActiveBoosts] Error fetching boosts:', error.message);
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
        name: prettifyBoostKey(boost.boost_key),
        effect: boost.multiplier > 1 ? `${boost.multiplier}× Rewards` : `+${boost.add_amount} Rewards`
      };

      return {
        boostKey: boost.boost_key,
        scope: boost.scope,
        name: displayInfo.name,
        effect: displayInfo.effect,
        usesLeft: boost.uses_remaining,
        expiresAt: boost.expires_at,
        multiplier: boost.multiplier ?? 1,
        addAmount: boost.add_amount ?? 0
      };
    });
  } catch (err) {
    console.error('[fetchActiveBoosts] Unexpected error:', err);
    return [];
  }
}
