/**
 * Celebration Queue System
 * Coordinates celebrations to prevent overlapping (e.g., HeartCoin + Badge)
 * HeartCoin celebrations have priority and badge celebrations wait for them to finish.
 */

import { isOnboardingSequenceActive } from '@/utils/onboardingSequence';

// ============================================================================
// DEBUG FLAG - Toggle to enable/disable debug logging
// ============================================================================
const DEBUG_CELEBRATIONS = false;

function debugQueue(message: string, data?: any) {
  if (DEBUG_CELEBRATIONS) {
    console.log(`[CELEBRATION_QUEUE] ${message}`, data ?? "");
  }
}

// HeartCoin celebration duration in ms
const HEARTCOIN_CELEBRATION_DURATION = 3000;

// Track when HeartCoin celebration will end
let heartcoinCelebrationEndTime: number = 0;

// Queue for pending badge celebrations
interface PendingBadgeCelebration {
  badgeImage: string;
  badgeTitle: string;
  queuedAt: number;
}
const badgeCelebrationQueue: PendingBadgeCelebration[] = [];

// Track badges that have been celebrated this session to prevent duplicates
const celebratedBadgeTitles = new Set<string>();

// Flag to prevent multiple queue processors
let isProcessingQueue = false;

// Flag to temporarily suppress all badge celebrations (e.g., during tour)
let suppressCelebrations = false;
let suppressionEndTime: number = 0;
let suppressionTimeout: NodeJS.Timeout | null = null;

// Listeners for suppression end events
type SuppressionEndListener = () => void;
const suppressionEndListeners: Set<SuppressionEndListener> = new Set();

/**
 * Marks that a HeartCoin celebration has started.
 * Call this when triggering a HeartCoin celebration.
 */
export function markHeartcoinCelebrationStarted(): void {
  heartcoinCelebrationEndTime = Date.now() + HEARTCOIN_CELEBRATION_DURATION;
  debugQueue("HeartCoin celebration started", {
    endTime: heartcoinCelebrationEndTime,
    duration: HEARTCOIN_CELEBRATION_DURATION
  });
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
 * Prevents duplicate celebrations for the same badge in this session.
 *
 * IMPORTANT: When suppressed, badges are deferred (NOT lost). They will play
 * when suppression ends via enableBadgeCelebrations() or timeout.
 */
export function queueBadgeCelebration(badgeImage: string, badgeTitle: string): void {
  if (typeof window === 'undefined') return;

  // Skip queueing during onboarding sequence - we manually control badges
  if (isOnboardingSequenceActive()) {
    debugQueue("BADGE_CELEBRATION_SKIPPED", {
      badge_title: badgeTitle,
      reason: "onboarding_sequence_active"
    });
    return;
  }

  // Prevent duplicate celebrations for the same badge (already celebrated)
  if (celebratedBadgeTitles.has(badgeTitle)) {
    debugQueue("BADGE_CELEBRATION_SKIPPED_DUP", {
      badge_title: badgeTitle,
      reason: "already_celebrated_this_session"
    });
    return;
  }

  // Also check if already in queue (dedupe by title)
  const alreadyInQueue = badgeCelebrationQueue.some(item => item.badgeTitle === badgeTitle);
  if (alreadyInQueue) {
    debugQueue("BADGE_CELEBRATION_SKIPPED_DUP", {
      badge_title: badgeTitle,
      reason: "already_in_queue"
    });
    return;
  }

  // Add to queue (DO NOT mark as celebrated yet - only mark when actually triggered)
  badgeCelebrationQueue.push({ badgeImage, badgeTitle, queuedAt: Date.now() });

  debugQueue("BADGE_CELEBRATION_ENQUEUE", {
    badge_title: badgeTitle,
    queue_length: badgeCelebrationQueue.length,
    suppressed: suppressCelebrations
  });

  // Log queue state
  debugQueue("CELEBRATION_QUEUE_STATE", {
    len: badgeCelebrationQueue.length,
    active: isProcessingQueue ? "processing" : "idle",
    heartcoin_active: isHeartcoinCelebrationActive(),
    suppressed: suppressCelebrations
  });

  // If suppressed, don't process - the queue will drain when suppression ends
  if (suppressCelebrations) {
    debugQueue("BADGE_CELEBRATION_DEFERRED", {
      badge_title: badgeTitle,
      reason: "suppressed - will drain when enabled"
    });
    return;
  }

  // Drop badge celebrations queued while a heartcoin celebration is active
  // to prevent auto-chaining celebrations
  if (isHeartcoinCelebrationActive()) {
    badgeCelebrationQueue.length = 0;
    debugQueue("BADGE_CELEBRATION_DROPPED", {
      badge_title: badgeTitle,
      reason: "heartcoin celebration active - no auto-chaining"
    });
    return;
  }

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
  debugQueue("Starting queue processing");

  const processNext = () => {
    if (badgeCelebrationQueue.length === 0) {
      isProcessingQueue = false;
      debugQueue("Queue empty, stopping processor");
      return;
    }

    // If suppressed, pause processing (don't drop badges) - retry later
    if (suppressCelebrations) {
      debugQueue("Pausing queue processing - celebrations suppressed", {
        queue_length: badgeCelebrationQueue.length
      });
      isProcessingQueue = false;
      // Will resume when enableBadgeCelebrations() or suppression timeout calls processQueue()
      return;
    }

    const remainingTime = getHeartcoinCelebrationRemainingTime();

    if (remainingTime > 0) {
      // Drop queued badge celebrations instead of auto-chaining after heartcoin
      debugQueue("Dropping queued badge celebrations - heartcoin celebration active", {
        remainingMs: remainingTime,
        dropped: badgeCelebrationQueue.length
      });
      badgeCelebrationQueue.length = 0;
      isProcessingQueue = false;
      return;
    } else {
      // No active HeartCoin celebration, trigger the badge celebration
      const next = badgeCelebrationQueue.shift();
      if (next) {
        // Mark as celebrated NOW (right before triggering) - not when queued
        celebratedBadgeTitles.add(next.badgeTitle);

        debugQueue("Processing badge celebration", {
          badge_title: next.badgeTitle,
          wait_time_ms: Date.now() - next.queuedAt
        });

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
  debugQueue("Queue cleared");
}

/**
 * Temporarily suppress all badge celebrations.
 * Use when starting the tour or other flows where celebrations would be disruptive.
 * Auto-clears after the specified duration (default 10 seconds).
 *
 * Badges queued during suppression are NOT lost - they will be drained when
 * suppression ends (either via timeout or enableBadgeCelebrations).
 *
 * Multiple calls extend suppression to the maximum end time (resilient to repeated calls).
 */
export function suppressBadgeCelebrations(durationMs: number = 10000): void {
  suppressCelebrations = true;

  const newEndTime = Date.now() + durationMs;

  // Use max end time if multiple calls overlap
  if (newEndTime > suppressionEndTime) {
    suppressionEndTime = newEndTime;

    // Clear any existing timeout
    if (suppressionTimeout) {
      clearTimeout(suppressionTimeout);
    }

    // Auto-clear suppression after duration and notify listeners
    suppressionTimeout = setTimeout(() => {
      suppressCelebrations = false;
      suppressionEndTime = 0;
      suppressionTimeout = null;
      debugQueue("Suppression auto-cleared, notifying listeners", {
        queue_length: badgeCelebrationQueue.length,
        listener_count: suppressionEndListeners.size
      });

      // Notify all listeners that suppression has ended
      notifySuppressionEnd();

      // Clear any badges that were queued during suppression instead of auto-playing them.
      // Auto-draining caused unexpected delayed celebrations (e.g., badge popping up
      // 10 seconds after a journal entry).
      if (badgeCelebrationQueue.length > 0) {
        debugQueue("Clearing queued badges on suppression end (not auto-playing)", {
          dropped: badgeCelebrationQueue.length
        });
        badgeCelebrationQueue.length = 0;
      }
    }, durationMs);

    debugQueue("Badge celebrations suppressed", { durationMs, endTime: suppressionEndTime });
  } else {
    debugQueue("Badge celebrations suppression extended (existing end time is later)", {
      currentEndTime: suppressionEndTime,
      requestedEndTime: newEndTime
    });
  }
}

/**
 * Notify all suppression end listeners
 */
function notifySuppressionEnd(): void {
  suppressionEndListeners.forEach(listener => {
    try {
      listener();
    } catch (err) {
      console.error('[CELEBRATION_QUEUE] Error in suppression end listener:', err);
    }
  });
}

/**
 * Subscribe to suppression end events.
 * Returns an unsubscribe function.
 */
export function onSuppressionEnd(listener: SuppressionEndListener): () => void {
  suppressionEndListeners.add(listener);
  debugQueue("Added suppression end listener", { count: suppressionEndListeners.size });

  return () => {
    suppressionEndListeners.delete(listener);
    debugQueue("Removed suppression end listener", { count: suppressionEndListeners.size });
  };
}

/**
 * Get remaining suppression time in milliseconds.
 * Returns 0 if not suppressed.
 */
export function getSuppressionRemainingTime(): number {
  if (!suppressCelebrations) return 0;
  const remaining = suppressionEndTime - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Immediately re-enable badge celebrations and drain any queued badges.
 */
export function enableBadgeCelebrations(): void {
  const wasSuppressed = suppressCelebrations;
  suppressCelebrations = false;
  suppressionEndTime = 0;
  if (suppressionTimeout) {
    clearTimeout(suppressionTimeout);
    suppressionTimeout = null;
  }
  debugQueue("Badge celebrations enabled, draining queue", {
    queue_length: badgeCelebrationQueue.length
  });

  // Notify listeners if we were suppressed
  if (wasSuppressed) {
    notifySuppressionEnd();
  }

  // Immediately drain any badges that were queued during suppression
  processQueue();
}

/**
 * Returns whether badge celebrations are currently suppressed.
 * Useful for consumers (like realtime controllers) that need to skip enqueuing.
 */
export function areBadgeCelebrationsSuppressed(): boolean {
  return suppressCelebrations;
}

/**
 * Clears the set of celebrated badge titles.
 * Useful for testing or when you want to allow re-celebrations.
 */
export function clearCelebratedBadges(): void {
  celebratedBadgeTitles.clear();
  debugQueue("Celebrated badges cleared");
}
