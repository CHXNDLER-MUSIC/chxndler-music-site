/**
 * Badge celebration event system
 * Triggers custom browser events when a badge is earned
 */

export interface BadgeCelebrationDetail {
  badgeImage: string;
  badgeTitle: string;
}

export const BADGE_CELEBRATION_EVENT = 'badge-celebration';

/**
 * Triggers a Badge celebration event in the browser
 * Safe to call on server - will do nothing if window is not available
 *
 * @param badgeImage - The URL of the badge image to display
 * @param badgeTitle - The title/name of the earned badge
 */
export function triggerBadgeCelebration(badgeImage: string, badgeTitle: string): void {
  if (typeof window === 'undefined') return;

  const detail: BadgeCelebrationDetail = { badgeImage, badgeTitle };
  const event = new CustomEvent(BADGE_CELEBRATION_EVENT, { detail });
  window.dispatchEvent(event);
}

