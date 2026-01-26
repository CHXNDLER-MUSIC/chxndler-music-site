/**
 * HeartCoin celebration event system
 * Triggers custom browser events when HeartCoins are earned
 */

import { markHeartcoinCelebrationStarted, isHeartcoinCelebrationActive, getHeartcoinCelebrationRemainingTime } from './celebrationQueue';

// ============================================================================
// DEBUG FLAG - Toggle to enable/disable debug logging
// ============================================================================
const DEBUG_CELEBRATIONS = true; // Set to false in production

function debugCelebration(message: string, data?: any) {
  if (DEBUG_CELEBRATIONS) {
    console.log(`[HEARTCOIN_CELEBRATION] ${message}`, data ?? "");
  }
}

export interface HeartCoinCelebrationDetail {
  amount: number;
}

export const HEARTCOIN_CELEBRATION_EVENT = 'heartcoin-celebration';

// Suppression flag for temporarily disabling heartcoin celebrations
let suppressCelebration = false;
// Timestamp of last dispatched celebration to avoid duplicates
let lastCelebrationAt = 0;
// Minimum gap between celebrations (ms) to guard against duplicate triggers
const CELEBRATION_DEDUP_WINDOW_MS = 4000;

// ============================================================================
// Pending accumulator for coins that arrive while a celebration is active
// ============================================================================
let pendingAmount = 0;
let pendingTimer: NodeJS.Timeout | null = null;

/**
 * Suppresses the next heartcoin celebration.
 * Used when we want to award a relic without showing the heartcoin celebration.
 */
export function suppressNextHeartcoinCelebration(): void {
  suppressCelebration = true;
  debugCelebration("Suppression enabled");
  // Auto-reset after 5 seconds in case something goes wrong
  setTimeout(() => {
    suppressCelebration = false;
  }, 5000);
}

/**
 * Clears the suppression flag.
 * Called after the profile refresh is complete.
 */
export function clearHeartcoinCelebrationSuppression(): void {
  suppressCelebration = false;
  debugCelebration("Suppression cleared");
}

/**
 * Checks if heartcoin celebration is currently suppressed.
 */
export function isHeartcoinCelebrationSuppressed(): boolean {
  return suppressCelebration;
}

/**
 * Internal function to actually dispatch the celebration event.
 * Bypasses dedup checks - used for flushing accumulated pending coins.
 */
function dispatchCelebration(amount: number, source: string): void {
  const now = Date.now();

  // Mark that a HeartCoin celebration is starting (for queue coordination)
  markHeartcoinCelebrationStarted();
  lastCelebrationAt = now;

  debugCelebration("COIN_CELEBRATION", {
    amount,
    timestamp: now,
    source
  });

  const detail: HeartCoinCelebrationDetail = { amount };
  const event = new CustomEvent(HEARTCOIN_CELEBRATION_EVENT, { detail });
  window.dispatchEvent(event);
}

/**
 * Flushes accumulated pending coins as a single celebration.
 * Called after the current celebration ends.
 */
function flushPendingCoins(): void {
  pendingTimer = null;

  if (pendingAmount <= 0) {
    debugCelebration("PENDING_FLUSH_SKIP", { reason: "no_pending_amount" });
    return;
  }

  // If still active (shouldn't happen, but guard), reschedule
  if (isHeartcoinCelebrationActive()) {
    const remainingTime = getHeartcoinCelebrationRemainingTime();
    debugCelebration("PENDING_FLUSH_RESCHEDULE", {
      pending_amount: pendingAmount,
      remaining_ms: remainingTime
    });
    pendingTimer = setTimeout(flushPendingCoins, remainingTime + 150);
    return;
  }

  const amountToFlush = pendingAmount;
  pendingAmount = 0;

  debugCelebration("PENDING_FLUSH", { amount: amountToFlush });
  dispatchCelebration(amountToFlush, "pending_flush");
}

/**
 * Triggers a HeartCoin celebration event in the browser
 * Safe to call on server - will do nothing if window is not available
 *
 * If a celebration is already active, the coins are accumulated and will
 * be shown in a follow-up celebration after the current one ends.
 *
 * @param amount - The amount of HeartCoins earned
 */
export function triggerHeartCoinCelebration(amount: number): void {
  // Guard against server-side execution
  if (typeof window === 'undefined') {
    return;
  }

  // Check if celebrations are suppressed
  if (suppressCelebration) {
    debugCelebration("COIN_CELEBRATION_SKIPPED", {
      amount,
      reason: "suppressed"
    });
    suppressCelebration = false; // Reset the flag
    return;
  }

  const now = Date.now();
  const timeSinceLastCelebration = now - lastCelebrationAt;

  // If a HeartCoin celebration is already active, accumulate and schedule flush
  if (isHeartcoinCelebrationActive()) {
    pendingAmount += amount;
    debugCelebration("COIN_CELEBRATION_ACCUMULATED", {
      amount,
      pending_total: pendingAmount,
      reason: "already_active"
    });

    // Schedule or reschedule the flush for after current celebration ends
    if (pendingTimer) {
      clearTimeout(pendingTimer);
    }
    const remainingTime = getHeartcoinCelebrationRemainingTime();
    pendingTimer = setTimeout(flushPendingCoins, remainingTime + 150);
    debugCelebration("PENDING_FLUSH_SCHEDULED", {
      delay_ms: remainingTime + 150
    });
    return;
  }

  // Dedup window check - but if we're in dedup window, still accumulate
  if (timeSinceLastCelebration < CELEBRATION_DEDUP_WINDOW_MS) {
    pendingAmount += amount;
    debugCelebration("COIN_CELEBRATION_ACCUMULATED", {
      amount,
      pending_total: pendingAmount,
      reason: "dedup_window",
      timeSinceLastMs: timeSinceLastCelebration
    });

    // Schedule flush for after dedup window passes
    if (pendingTimer) {
      clearTimeout(pendingTimer);
    }
    const waitTime = CELEBRATION_DEDUP_WINDOW_MS - timeSinceLastCelebration + 150;
    pendingTimer = setTimeout(flushPendingCoins, waitTime);
    debugCelebration("PENDING_FLUSH_SCHEDULED", {
      delay_ms: waitTime,
      reason: "dedup_window"
    });
    return;
  }

  // No active celebration and outside dedup window - trigger immediately
  dispatchCelebration(amount, "immediate");
}
