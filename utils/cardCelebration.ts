/**
 * Card purchase celebration event system
 * Triggers custom browser events when cards are purchased
 */

import { suppressBadgeCelebrations } from './celebrationQueue';

export interface CardCelebrationDetail {
  cardImage: string;
  cardName: string;
}

export const CARD_CELEBRATION_EVENT = 'card-celebration';

// Duration to suppress badge celebrations after card purchase (5 seconds)
const BADGE_SUPPRESSION_DURATION_MS = 5000;

/**
 * Triggers a Card purchase celebration event in the browser
 * Safe to call on server - will do nothing if window is not available
 *
 * @param cardImage - The URL of the card image to display
 * @param cardName - The name of the purchased card
 */
export function triggerCardCelebration(cardImage: string, cardName: string): void {
  // Guard against server-side execution
  if (typeof window === 'undefined') {
    return;
  }

  // Suppress badge celebrations during card celebration to prevent overlap
  suppressBadgeCelebrations(BADGE_SUPPRESSION_DURATION_MS);

  const detail: CardCelebrationDetail = { cardImage, cardName };
  const event = new CustomEvent(CARD_CELEBRATION_EVENT, { detail });
  window.dispatchEvent(event);
}