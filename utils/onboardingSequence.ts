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

function describeError(error: any) {
  if (!error) return error;
  return { message: error.message, code: error.code, details: error.details, hint: error.hint };
}

// Same session-or-fallback-token pattern used by ProfileContext/WhatElementAreYouModal:
// right after ALIGN, supabase.auth.getSession() can briefly report no session even though
// the OTP verification already succeeded. WelcomeHomeModal stashes the verified user id +
// raw access token in sessionStorage for exactly this window. Without this fallback, the
// flag check/update below silently ran as the anonymous role, got blocked by RLS, and never
// actually read/wrote the flag — logged only as an opaque "Error checking/updating DB flag".
async function getOnboardingIdentity(): Promise<{ session: any; accessToken: string | null }> {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  const accessToken = typeof window !== 'undefined' ? sessionStorage.getItem('chx_at') : null;
  return { session, accessToken };
}

async function fetchOnboardingFlag(userId: string): Promise<{ completed: boolean; error?: any }> {
  const { session, accessToken } = await getOnboardingIdentity();

  if (session) {
    const { data, error } = await supabaseBrowser
      .from('profiles')
      .select('onboarding_reward_sequence_completed')
      .eq('id', userId)
      .maybeSingle();
    if (error) return { completed: false, error };
    return { completed: !!data?.onboarding_reward_sequence_completed };
  }

  if (!accessToken) {
    return { completed: false, error: { message: 'No client session and no fallback access token' } };
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const res = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=onboarding_reward_sequence_completed`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { completed: false, error: { message: `Flag fetch failed (${res.status})`, details: body } };
    }
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    return { completed: !!row?.onboarding_reward_sequence_completed };
  } catch (err: any) {
    return { completed: false, error: { message: err?.message || 'Flag fetch threw' } };
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
  const { completed, error } = await fetchOnboardingFlag(userId);
  if (error) {
    debugOnboarding('Error checking DB flag, continuing anyway', describeError(error));
  } else if (completed) {
    debugOnboarding('Sequence already completed for user — skipping rewards');
    return;
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

  const { completed, error: flagCheckError } = await fetchOnboardingFlag(userId);
  if (flagCheckError) {
    debugOnboarding('Error checking DB flag in runRewardSequence, continuing anyway', describeError(flagCheckError));
  } else if (completed) {
    debugOnboarding('Rewards already granted — skipping');
    sequenceActive = false;
    return;
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

  // Step 3: Wait for the Wanderer badge celebration to complete. The badge
  // award itself (and its celebration) is handled reactively by the real
  // badge-celebration system (lib/useBadgeCelebrations.ts +
  // components/BadgeCelebrationController.tsx) once the caller's
  // checkAndAwardEligibleBadges call inserts the user_badges row — this
  // orchestrator just waits for that system's completion event before
  // showing the claim card.
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
  const { session, accessToken } = await getOnboardingIdentity();

  if (session) {
    try {
      const { error } = await supabaseBrowser
        .from('profiles')
        .update({ onboarding_reward_sequence_completed: true })
        .eq('id', userId);

      if (error) {
        debugOnboarding('Error updating DB flag', describeError(error));
      } else {
        debugOnboarding('DB flag updated successfully');
      }
    } catch (err: any) {
      debugOnboarding('Exception updating DB flag', { message: err?.message });
    }
    return;
  }

  if (!accessToken) {
    debugOnboarding('Skipping DB flag update — no client session and no fallback access token');
    return;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ onboarding_reward_sequence_completed: true }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      debugOnboarding('Error updating DB flag via REST fallback', { status: res.status, body });
    } else {
      debugOnboarding('DB flag updated successfully via REST fallback');
    }
  } catch (err: any) {
    debugOnboarding('Exception updating DB flag via REST fallback', { message: err?.message });
  }
}

function cleanup(): void {
  cleanupFns.forEach(fn => {
    try { fn(); } catch {}
  });
  cleanupFns = [];
}
