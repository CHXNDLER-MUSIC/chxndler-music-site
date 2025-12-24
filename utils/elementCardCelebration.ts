/**
 * Element Card celebration event system
 * Triggers custom browser events when user warps to their element planet
 */

export interface ElementCardCelebrationDetail {
  element: string;
  userName?: string; // User's name to display in "Welcome Home, [name]"
  onComplete?: () => void; // Callback after celebration finishes
}

export const ELEMENT_CARD_CELEBRATION_EVENT = 'element-card-celebration';

/**
 * Triggers an Element Card celebration event in the browser
 * Safe to call on server - will do nothing if window is not available
 *
 * @param element - The element type (heart, water, lightning, darkness)
 * @param userName - The user's name to display
 * @param onComplete - Optional callback to run after celebration completes
 */
export function triggerElementCardCelebration(element: string, userName?: string, onComplete?: () => void): void {
  // Guard against server-side execution
  if (typeof window === 'undefined') {
    return;
  }

  const detail: ElementCardCelebrationDetail = { element, userName, onComplete };
  const event = new CustomEvent(ELEMENT_CARD_CELEBRATION_EVENT, { detail });
  window.dispatchEvent(event);
}
