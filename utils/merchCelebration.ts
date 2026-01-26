/**
 * Merch celebration event system
 * Triggers custom browser events when merch items are purchased
 */

import { suppressBadgeCelebrations } from './celebrationQueue';

export interface MerchCelebrationDetail {
  itemName: string;
  imageUrl: string;
}

export const MERCH_CELEBRATION_EVENT = 'merch-celebration';

// Duration to suppress badge celebrations after merch purchase (5 seconds)
const BADGE_SUPPRESSION_DURATION_MS = 5000;

/**
 * Triggers a merch celebration event in the browser
 * Safe to call on server - will do nothing if window is not available
 *
 * @param itemName - The name of the purchased item
 * @param imageUrl - The image URL of the purchased item
 */
export function triggerMerchCelebration(itemName: string, imageUrl: string): void {
  // Guard against server-side execution
  if (typeof window === 'undefined') {
    return;
  }

  // Suppress badge celebrations during merch celebration to prevent overlap
  suppressBadgeCelebrations(BADGE_SUPPRESSION_DURATION_MS);

  const detail: MerchCelebrationDetail = { itemName, imageUrl };
  const event = new CustomEvent(MERCH_CELEBRATION_EVENT, { detail });
  window.dispatchEvent(event);
}
