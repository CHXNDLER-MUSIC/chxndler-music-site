/**
 * HeartCoin celebration event system
 * Triggers custom browser events when HeartCoins are earned
 */

export interface HeartCoinCelebrationDetail {
  amount: number;
}

export const HEARTCOIN_CELEBRATION_EVENT = 'heartcoin-celebration';

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

  const detail: HeartCoinCelebrationDetail = { amount };
  const event = new CustomEvent(HEARTCOIN_CELEBRATION_EVENT, { detail });
  window.dispatchEvent(event);
}