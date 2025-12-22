/**
 * Merch celebration event system
 * Triggers custom browser events when merch items are purchased
 */

export interface MerchCelebrationDetail {
  itemName: string;
  imageUrl: string;
}

export const MERCH_CELEBRATION_EVENT = 'merch-celebration';

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

  const detail: MerchCelebrationDetail = { itemName, imageUrl };
  const event = new CustomEvent(MERCH_CELEBRATION_EVENT, { detail });
  window.dispatchEvent(event);
}
