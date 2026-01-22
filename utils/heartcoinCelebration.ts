/**
 * HeartCoin celebration event system
 * Triggers custom browser events when HeartCoins are earned
 */

import { markHeartcoinCelebrationStarted, isHeartcoinCelebrationActive } from './celebrationQueue';

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

/**
 * Suppresses the next heartcoin celebration.
 * Used when we want to award a relic without showing the heartcoin celebration.
 */
export function suppressNextHeartcoinCelebration(): void {
  suppressCelebration = true;
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
}

/**
 * Checks if heartcoin celebration is currently suppressed.
 */
export function isHeartcoinCelebrationSuppressed(): boolean {
  return suppressCelebration;
}

/**
 * Triggers a HeartCoin celebration event in the browser
 * Safe to call on server - will do nothing if window is not available
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
    suppressCelebration = false; // Reset the flag
    return;
  }

  // If a HeartCoin celebration is already active or recently fired, skip
  const now = Date.now();
  if (isHeartcoinCelebrationActive() || (now - lastCelebrationAt) < CELEBRATION_DEDUP_WINDOW_MS) {
    return;
  }

  // Mark that a HeartCoin celebration is starting (for queue coordination)
  markHeartcoinCelebrationStarted();
  lastCelebrationAt = now;

  const detail: HeartCoinCelebrationDetail = { amount };
  const event = new CustomEvent(HEARTCOIN_CELEBRATION_EVENT, { detail });
  window.dispatchEvent(event);
}
