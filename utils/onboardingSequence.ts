/**
 * Onboarding Sequence Orchestrator
 *
 * Coordinates the first-time user onboarding reward sequence:
 * 1. Tour prompt appears after warp lands ("Let me show you around")
 * 2. On Skip or Got it! → HeartCoin celebration → Wanderer badge celebration → claim card
 *
 * Uses explicit event-driven sequencing to prevent overlapping celebrations
 * and race conditions. The sequence only runs once per user (tracked by DB flag).
 */

import { supabaseBrowser } from '@/lib/supabase-browser';
import { triggerBadgeCelebration } from '@/utils/badgeCelebration';
import { triggerHeartCoinCelebration } from '@/utils/heartcoinCelebration';

// ============================================================================
// Constants
// ============================================================================

export const ONBOARDING_SEQUENCE_COMPLETE = 'onboarding:sequence-complete';
const HEARTCOIN_COMPLETE_EVENT = 'heartcoin:celebration-complete';
const BADGE_COMPLETE_EVENT = 'badge:celebration-complete';

// Safety timeouts (fallback if events don't fire)
const HEARTCOIN_TIMEOUT_MS = 5000; // 5s fallback for HeartCoin (normally 3s)
const BADGE_TIMEOUT_MS = 6000; // 6s fallback for badge (normally ~3.5s)

// ============================================================================
// State
// ============================================================================

let sequenceActive = false;
let cleanupFns: (() => void)[] = [];

// ============================================================================
// Debug Logging
// ============================================================================

const DEBUG_ONBOARDING = true;

function debugOnboarding(message: string, data?: any) {
  if (DEBUG_ONBOARDING && process.env.NODE_ENV !== "production") {
    console.log(`[ONBOARDING_SEQUENCE] ${message}`, data ?? '');
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if the onboarding sequence is currently active.
 * Used by other modules to skip automatic celebrations during the sequence.
 */
export function isOnboardingSequenceActive(): boolean {
  return sequenceActive;
}

/**
 * Start the onboarding sequence.
 * Called by WhatElementAreYouModal immediately after successful ALIGN.
 *
 * Sets sequenceActive so TourContext defers the tour prompt until
 * ONBOARDING_SEQUENCE_COMPLETE fires (after the warp lands).
 * Heartcoin/badge celebrations are suppressed here and run later
 * via runRewardSequence (called when user skips or finishes the tour).
 */
export async function startOnboardingSequence(userId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  if (sequenceActive) {
    debugOnboarding('Sequence already active, skipping');
    return;
  }

  debugOnboarding('Starting onboarding sequence', { userId });

  // Set synchronously so TourContext defers auto-start immediately.
  sequenceActive = true;

  // Check DB flag — if already done, sequenceActive stays true for the
  // warp window so the tour prompt still shows, but runRewardSequence
  // will no-op when called.
  try {
    const { data: profile, error } = await supabaseBrowser
      .from('profiles')
      .select('onboarding_reward_sequence_completed')
      .eq('id', userId)
      .single();

    if (error) {
      debugOnboarding('Error checking DB flag, continuing anyway', { error: error.message });
    } else if (profile?.onboarding_reward_sequence_completed) {
      debugOnboarding('Sequence already completed for user — skipping rewards');
      return;
    }
  } catch (err) {
    debugOnboarding('Exception checking DB flag', { err });
  }
}

/**
 * Run the reward sequence: HeartCoin → Wanderer badge → claim card.
 * Called by TourContext when the user clicks "Skip for now" or "Got it!".
 *
 * Flow:
 * 1. Check DB flag — bail if already completed
 * 2. Force-trigger HeartCoin celebration (was suppressed at ALIGN time)
 * 3. Wait for HeartCoin celebration to finish
 * 4. Trigger Wanderer badge celebration
 * 5. Wait for badge to finish
 * 6. Update DB flag
 * 7. Dispatch openHeartverseCard to show claim card
 *
 * `skipHeartCoinCelebration` lets callers that already handled the HeartCoin
 * award/celebration themselves (e.g. TourContext's claim_tour_reward call)
 * skip straight to the badge step instead of showing a second celebration.
 */
export async function runRewardSequence(
  userId: string,
  options?: { skipHeartCoinCelebration?: boolean }
): Promise<void> {
  if (typeof window === 'undefined') return;

  debugOnboarding('Running reward sequence', { userId });

  try {
    const { data: profile } = await supabaseBrowser
      .from('profiles')
      .select('onboarding_reward_sequence_completed')
      .eq('id', userId)
      .single();

    if (profile?.onboarding_reward_sequence_completed) {
      debugOnboarding('Rewards already granted — skipping');
      sequenceActive = false;
      return;
    }
  } catch (err) {
    debugOnboarding('Exception checking DB flag in runRewardSequence', { err });
  }

  if (!options?.skipHeartCoinCelebration) {
    // Step 1: HeartCoin celebration (force because auto-celebration was suppressed)
    debugOnboarding('Triggering HeartCoin celebration');
    triggerHeartCoinCelebration(1, { force: true });

    // Step 2: Wait for HeartCoin celebration to complete
    debugOnboarding('Waiting for HeartCoin celebration to complete...');
    await waitForHeartCoinComplete();
  } else {
    debugOnboarding('Skipping HeartCoin celebration — already handled by caller');
  }

  await delay(300);

  // Step 3: Trigger Wanderer badge celebration
  debugOnboarding('Triggering Wanderer badge celebration');
  await triggerWandererBadge();

  // Step 4: Wait for badge celebration to complete
  debugOnboarding('Waiting for badge celebration to complete...');
  await waitForBadgeComplete();

  // Step 5: Update DB flag
  await updateDbFlag(userId);

  await delay(300);

  // Step 6: Show claim card and finish
  debugOnboarding('Reward sequence complete — showing claim card');
  sequenceActive = false;
  window.dispatchEvent(new CustomEvent('openHeartverseCard'));

  cleanup();
}

// ============================================================================
// Private Helpers
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForHeartCoinComplete(): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;

    const handler = () => {
      if (resolved) return;
      resolved = true;
      debugOnboarding('HeartCoin celebration complete event received');
      window.removeEventListener(HEARTCOIN_COMPLETE_EVENT, handler);
      resolve();
    };

    window.addEventListener(HEARTCOIN_COMPLETE_EVENT, handler);
    cleanupFns.push(() => window.removeEventListener(HEARTCOIN_COMPLETE_EVENT, handler));

    // Safety timeout in case event doesn't fire
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      debugOnboarding('HeartCoin celebration timeout (fallback)');
      window.removeEventListener(HEARTCOIN_COMPLETE_EVENT, handler);
      resolve();
    }, HEARTCOIN_TIMEOUT_MS);
  });
}

async function triggerWandererBadge(): Promise<void> {
  // Fetch Wanderer badge details
  try {
    const { data: badge, error } = await supabaseBrowser
      .from('badges')
      .select('icon_url, badge_name')
      .eq('badge_name', 'Wanderer')
      .single();

    if (error || !badge) {
      debugOnboarding('Could not fetch Wanderer badge, using defaults', { error: error?.message });
      // Use defaults
      triggerBadgeCelebration('/elements/badge-wanderer.webp', 'Wanderer');
    } else {
      debugOnboarding('Triggering Wanderer badge', { badge });
      triggerBadgeCelebration(badge.icon_url || '/elements/badge-wanderer.webp', badge.badge_name);
    }
  } catch (err) {
    debugOnboarding('Exception fetching Wanderer badge', { err });
    triggerBadgeCelebration('/elements/badge-wanderer.webp', 'Wanderer');
  }
}

function waitForBadgeComplete(): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;

    const handler = (event: Event) => {
      if (resolved) return;
      const detail = (event as CustomEvent).detail;
      debugOnboarding('Badge celebration complete event received', { detail });
      resolved = true;
      window.removeEventListener(BADGE_COMPLETE_EVENT, handler);
      resolve();
    };

    window.addEventListener(BADGE_COMPLETE_EVENT, handler);
    cleanupFns.push(() => window.removeEventListener(BADGE_COMPLETE_EVENT, handler));

    // Safety timeout in case event doesn't fire
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      debugOnboarding('Badge celebration timeout (fallback)');
      window.removeEventListener(BADGE_COMPLETE_EVENT, handler);
      resolve();
    }, BADGE_TIMEOUT_MS);
  });
}

async function updateDbFlag(userId: string): Promise<void> {
  try {
    const { error } = await supabaseBrowser
      .from('profiles')
      .update({ onboarding_reward_sequence_completed: true })
      .eq('id', userId);

    if (error) {
      debugOnboarding('Error updating DB flag', { error: error.message });
    } else {
      debugOnboarding('DB flag updated successfully');
    }
  } catch (err) {
    debugOnboarding('Exception updating DB flag', { err });
  }
}

function cleanup(): void {
  cleanupFns.forEach(fn => {
    try { fn(); } catch {}
  });
  cleanupFns = [];
}
