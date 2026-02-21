/**
 * Onboarding Sequence Orchestrator
 *
 * Coordinates the first-time user onboarding reward sequence:
 * 1. HeartCoin celebration plays first (triggered by realtime subscription)
 * 2. Wanderer badge celebration plays after HeartCoin completes
 * 3. Tour prompt modal appears after badge celebration completes
 *
 * Uses explicit event-driven sequencing to prevent overlapping celebrations
 * and race conditions. The sequence only runs once per user (tracked by DB flag).
 */

import { supabaseBrowser } from '@/lib/supabase-browser';
import { triggerBadgeCelebration } from '@/utils/badgeCelebration';
import { suppressBadgeCelebrations } from '@/utils/celebrationQueue';

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
 * Start the onboarding reward sequence.
 * Called by WhatElementAreYouModal after successful ALIGN.
 *
 * Flow:
 * 1. Check DB flag - exit if already completed
 * 2. Suppress automatic badge celebrations
 * 3. Wait for HeartCoin celebration to complete
 * 4. Manually trigger Wanderer badge celebration
 * 5. Wait for badge celebration to complete
 * 6. Update DB flag
 * 7. Dispatch sequence-complete event
 */
export async function startOnboardingSequence(userId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  // Prevent double-start
  if (sequenceActive) {
    debugOnboarding('Sequence already active, skipping');
    return;
  }

  debugOnboarding('Starting onboarding sequence', { userId });

  // Check DB flag first
  try {
    const { data: profile, error } = await supabaseBrowser
      .from('profiles')
      .select('onboarding_reward_sequence_completed')
      .eq('id', userId)
      .single();

    if (error) {
      debugOnboarding('Error checking DB flag, continuing anyway', { error: error.message });
      // Continue anyway - we'll set the flag at the end
    } else if (profile?.onboarding_reward_sequence_completed) {
      debugOnboarding('Sequence already completed for user, exiting');
      return;
    }
  } catch (err) {
    debugOnboarding('Exception checking DB flag', { err });
    // Continue anyway
  }

  sequenceActive = true;

  // Suppress automatic badge celebrations during the sequence
  // Use a long duration - we'll manually control badges
  suppressBadgeCelebrations(30000);
  debugOnboarding('Badge celebrations suppressed');

  // Step 1: Wait for HeartCoin celebration to complete
  debugOnboarding('Waiting for HeartCoin celebration to complete...');
  await waitForHeartCoinComplete();

  // Small delay between celebrations
  await delay(300);

  // Step 2: Trigger Wanderer badge celebration
  debugOnboarding('Triggering Wanderer badge celebration');
  await triggerWandererBadge();

  // Step 3: Wait for badge celebration to complete
  debugOnboarding('Waiting for badge celebration to complete...');
  await waitForBadgeComplete();

  // Step 4: Update DB flag
  await updateDbFlag(userId);

  // Step 5: Dispatch sequence-complete event
  debugOnboarding('Sequence complete, dispatching event');
  sequenceActive = false;

  // Small delay before showing tour prompt
  await delay(500);

  window.dispatchEvent(new CustomEvent(ONBOARDING_SEQUENCE_COMPLETE, {
    detail: { userId }
  }));

  // Cleanup any remaining listeners
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
