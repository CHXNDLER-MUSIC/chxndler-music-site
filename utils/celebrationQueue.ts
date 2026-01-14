/**
 * Celebration Queue System
 * Coordinates celebrations to prevent overlapping (e.g., HeartCoin + Badge)
 * HeartCoin celebrations have priority and badge celebrations wait for them to finish.
 */

// HeartCoin celebration duration in ms
const HEARTCOIN_CELEBRATION_DURATION = 3000;

// Track when HeartCoin celebration will end
let heartcoinCelebrationEndTime: number = 0;

// Queue for pending badge celebrations
interface PendingBadgeCelebration {
  badgeImage: string;
  badgeTitle: string;
}
const badgeCelebrationQueue: PendingBadgeCelebration[] = [];

// Flag to prevent multiple queue processors
let isProcessingQueue = false;

/**
 * Marks that a HeartCoin celebration has started.
 * Call this when triggering a HeartCoin celebration.
 */
export function markHeartcoinCelebrationStarted(): void {
  heartcoinCelebrationEndTime = Date.now() + HEARTCOIN_CELEBRATION_DURATION;
}

/**
 * Gets the remaining time until HeartCoin celebration ends.
 * Returns 0 if no celebration is active.
 */
export function getHeartcoinCelebrationRemainingTime(): number {
  const remaining = heartcoinCelebrationEndTime - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Checks if a HeartCoin celebration is currently active.
 */
export function isHeartcoinCelebrationActive(): boolean {
  return getHeartcoinCelebrationRemainingTime() > 0;
}

/**
 * Queues a badge celebration to play after any active HeartCoin celebration.
 * If no HeartCoin celebration is active, plays immediately.
 */
export function queueBadgeCelebration(badgeImage: string, badgeTitle: string): void {
  if (typeof window === 'undefined') return;

  // Add to queue
  badgeCelebrationQueue.push({ badgeImage, badgeTitle });

  // Start processing if not already
  processQueue();
}

/**
 * Process the badge celebration queue.
 */
function processQueue(): void {
  if (isProcessingQueue) return;
  if (badgeCelebrationQueue.length === 0) return;

  isProcessingQueue = true;

  const processNext = () => {
    if (badgeCelebrationQueue.length === 0) {
      isProcessingQueue = false;
      return;
    }

    const remainingTime = getHeartcoinCelebrationRemainingTime();

    if (remainingTime > 0) {
      // Wait for HeartCoin celebration to finish + small buffer
      setTimeout(processNext, remainingTime + 500);
    } else {
      // No active HeartCoin celebration, trigger the badge celebration
      const next = badgeCelebrationQueue.shift();
      if (next) {
        // Import and trigger
        import('@/utils/badgeCelebration').then(({ triggerBadgeCelebration }) => {
          triggerBadgeCelebration(next.badgeImage, next.badgeTitle);
        });

        // Dispatch event after badge celebration finishes (3.5s duration)
        // This allows other components to react (e.g., show tour after Wanderer badge)
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('badge:celebration-complete', {
              detail: { badgeTitle: next.badgeTitle, badgeImage: next.badgeImage }
            }));
          }
        }, 3500);

        // Wait for badge celebration to finish before processing next (3.5s + buffer)
        setTimeout(processNext, 4000);
      } else {
        isProcessingQueue = false;
      }
    }
  };

  processNext();
}

/**
 * Clears the badge celebration queue.
 * Use sparingly - mainly for cleanup or testing.
 */
export function clearBadgeCelebrationQueue(): void {
  badgeCelebrationQueue.length = 0;
}
