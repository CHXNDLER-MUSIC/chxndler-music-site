'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { areBadgeCelebrationsSuppressed, onSuppressionEnd } from '@/utils/celebrationQueue';
import { isOnboardingSequenceActive } from '@/utils/onboardingSequence';

// ============================================================================
// DEBUG FLAG - Toggle to enable/disable debug logging
// ============================================================================
const DEBUG_CELEBRATIONS = false;

function debugCelebration(message: string, data?: any) {
  if (DEBUG_CELEBRATIONS) {
    console.log(`[BADGE_CELEBRATION] ${message}`, data ?? "");
  }
}

// ============================================================================
// LocalStorage Keys for Persistence
// ============================================================================
const SEEN_BADGES_KEY = 'heartverse_seen_badge_celebrations';
const SEEN_BADGES_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// Batch Window - Only celebrate the first badge when multiple unlock in close proximity
// Increase window to account for realtime/event latency so previously-unlocked
// or rapidly-awarded badges don't chain celebrations.
// ============================================================================
const BATCH_WINDOW_MS = 8000; // 8s window to aggressively dedupe follow-up celebrations

// ============================================================================
// Recency Window - Only celebrate badges earned very recently
// Defensive check to ensure we never celebrate retroactively-inserted badges.
// ============================================================================
const CELEBRATION_RECENCY_WINDOW_MS = 20000; // 20 seconds

// ============================================================================
// Init Grace Period - Block all celebrations for N seconds after initialization
// This is the primary defense against page-load celebrations caused by race
// conditions between realtime events, suppression timing, and localStorage dedup.
// ============================================================================
const INIT_GRACE_PERIOD_MS = 5000; // 5 seconds after init completes

// ============================================================================
// Types
// ============================================================================
export interface BadgeCelebrationItem {
  id: string;           // user_badges row id for deduplication
  badgeId: string;
  badgeName: string;
  iconUrl: string;
  heartCoins: number;
  earnedAt: string;     // ISO timestamp for deduplication
}

interface UserBadgeInsert {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

interface Badge {
  id: string;
  badge_name: string;
  icon_url: string;
  heart_coins: number;
}

interface SeenBadgeEntry {
  badgeId: string;
  earnedAt: string;
  seenAt: number; // timestamp when we saw it
}

interface UseBadgeCelebrationsReturn {
  next: BadgeCelebrationItem | null;
  pop: () => void;
  queueLength: number;
}

// ============================================================================
// LocalStorage Helpers for Persistent Deduplication
// ============================================================================

function getSeenBadgesFromStorage(): Map<string, SeenBadgeEntry> {
  if (typeof window === 'undefined') return new Map();

  try {
    const stored = localStorage.getItem(SEEN_BADGES_KEY);
    if (!stored) return new Map();

    const parsed: SeenBadgeEntry[] = JSON.parse(stored);
    const now = Date.now();

    // Filter out expired entries and build map
    const validEntries = parsed.filter(entry => (now - entry.seenAt) < SEEN_BADGES_TTL_MS);

    const map = new Map<string, SeenBadgeEntry>();
    validEntries.forEach(entry => {
      // Key by badge_id + earned_at for uniqueness
      const key = `${entry.badgeId}_${entry.earnedAt}`;
      map.set(key, entry);
    });

    return map;
  } catch (err) {
    console.error('[BADGE_CELEBRATION] Error reading from localStorage:', err);
    return new Map();
  }
}

function saveSeenBadgesToStorage(seenMap: Map<string, SeenBadgeEntry>): void {
  if (typeof window === 'undefined') return;

  try {
    const entries = Array.from(seenMap.values());
    localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('[BADGE_CELEBRATION] Error saving to localStorage:', err);
  }
}

function markBadgeAsSeen(badgeId: string, earnedAt: string, seenMap: Map<string, SeenBadgeEntry>): void {
  const key = `${badgeId}_${earnedAt}`;
  seenMap.set(key, {
    badgeId,
    earnedAt,
    seenAt: Date.now(),
  });
  saveSeenBadgesToStorage(seenMap);
}

function isBadgeSeen(badgeId: string, earnedAt: string, seenMap: Map<string, SeenBadgeEntry>): boolean {
  const key = `${badgeId}_${earnedAt}`;
  return seenMap.has(key);
}

/**
 * Mark a badge as "seen" directly in localStorage from outside the hook.
 * Used by checkAndAwardEligibleBadges to prevent the realtime handler from
 * celebrating badges that were awarded during the initial page-load badge check.
 */
export function markBadgeAsSeenInStorage(badgeId: string, earnedAt: string): void {
  if (typeof window === 'undefined') return;
  const seenMap = getSeenBadgesFromStorage();
  const key = `${badgeId}_${earnedAt}`;
  if (!seenMap.has(key)) {
    seenMap.set(key, { badgeId, earnedAt, seenAt: Date.now() });
    saveSeenBadgesToStorage(seenMap);
    debugCelebration("markBadgeAsSeenInStorage", { badgeId, earnedAt });
  }
}

// ============================================================================
// Manual Injection - lets a caller (e.g. the journal ritual) push a badge
// straight into the live celebration queue, bypassing the realtime/suppression
// pipeline entirely. Used for badges that are earned as the direct, intended
// result of an action whose own suppression window would otherwise swallow
// the celebration (see components/SoulStarJournal.tsx handleRitualComplete).
// Mirrors the onSuppressionEnd pub/sub pattern below.
// ============================================================================
type ManualCelebrationListener = (item: BadgeCelebrationItem) => void;
const manualCelebrationListeners: Set<ManualCelebrationListener> = new Set();

export function manuallyQueueBadgeCelebration(item: BadgeCelebrationItem): void {
  manualCelebrationListeners.forEach((listener) => {
    try {
      listener(item);
    } catch (err) {
      console.error('[BADGE_CELEBRATION] Error in manual celebration listener:', err);
    }
  });
}

// ============================================================================
// Main Hook
// ============================================================================

// Pending badge type for suppression queue
interface PendingBadge {
  badgeId: string;
  earnedAt: string;
  rowId: string;
}

export function useBadgeCelebrations(userId: string | null): UseBadgeCelebrationsReturn {
  const [queue, setQueue] = useState<BadgeCelebrationItem[]>([]);
  const seenBadgesRef = useRef<Map<string, SeenBadgeEntry>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null);
  // Track the userId we're subscribed to (not just boolean) to handle user changes
  const subscribedUserIdRef = useRef<string | null>(null);
  // Flag to track if initialization is in progress
  const initializingRef = useRef<boolean>(false);
  // Track when the last badge was queued to implement batch window
  const lastBadgeQueuedTimeRef = useRef<number>(0);
  // Track badge IDs that were skipped due to batch window (for logging)
  const skippedInBatchRef = useRef<Set<string>>(new Set());
  // Track when the subscription was established - only celebrate badges earned AFTER this time
  const subscriptionStartTimeRef = useRef<string | null>(null);
  // Pending badges queue for badges that arrive during suppression (keyed by badge_id to dedupe)
  const pendingBadgesRef = useRef<Map<string, PendingBadge>>(new Map());
  // Unsubscribe function for suppression end listener
  const unsubscribeSuppressionRef = useRef<(() => void) | null>(null);
  // Track when initialization completed - celebrations are blocked until grace period elapses
  const initCompletedAtRef = useRef<number>(0);

  const pop = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  // Subscribe to manually-injected celebrations (bypasses realtime/suppression
  // entirely). Independent of the userId-scoped effect below so it stays live
  // across user changes and doesn't require the realtime subscription to be up.
  useEffect(() => {
    const unsubscribe = ((): (() => void) => {
      const listener: ManualCelebrationListener = (item) => {
        markBadgeAsSeen(item.badgeId, item.earnedAt, seenBadgesRef.current);
        debugCelebration("BADGE_CELEBRATION_MANUAL_ENQUEUE", {
          badgeId: item.badgeId,
          badgeName: item.badgeName
        });
        setQueue((prev) => {
          const alreadyInQueue = prev.some(existing =>
            existing.badgeId === item.badgeId && existing.earnedAt === item.earnedAt
          );
          if (alreadyInQueue) return prev;
          return [...prev, item];
        });
      };
      manualCelebrationListeners.add(listener);
      return () => { manualCelebrationListeners.delete(listener); };
    })();
    return unsubscribe;
  }, []);

  useEffect(() => {
    // If no userId, clean up and return
    if (!userId) {
      if (channelRef.current) {
        debugCelebration("Cleaning up channel (no userId)");
        supabaseBrowser.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      subscribedUserIdRef.current = null;
      initializingRef.current = false;
      subscriptionStartTimeRef.current = null;
      return;
    }

    // If already subscribed to THIS user, skip
    if (subscribedUserIdRef.current === userId) {
      debugCelebration("Already subscribed to user, skipping", { userId });
      return;
    }

    // If initializing is in progress, skip (React Strict Mode protection)
    if (initializingRef.current) {
      debugCelebration("Initialization in progress, skipping", { userId });
      return;
    }

    // Clean up any existing channel from a different user
    if (channelRef.current) {
      debugCelebration("Cleaning up channel (user changed)", {
        oldUser: subscribedUserIdRef.current,
        newUser: userId
      });
      supabaseBrowser.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    initializingRef.current = true;

    // Load seen badges from localStorage
    seenBadgesRef.current = getSeenBadgesFromStorage();
    debugCelebration("Loaded seen badges from storage", {
      count: seenBadgesRef.current.size,
      userId
    });

    // Initialize seenBadgesRef with all existing badges to prevent celebrations on page load
    const initializeSeenBadges = async () => {
      try {
        const { data: existingBadges, error } = await supabaseBrowser
          .from('user_badges')
          .select('id, badge_id, earned_at')
          .eq('user_id', userId);

        if (!error && existingBadges) {
          // Mark all existing badges as seen (don't celebrate on page load)
          existingBadges.forEach(badge => {
            const key = `${badge.badge_id}_${badge.earned_at}`;
            if (!seenBadgesRef.current.has(key)) {
              markBadgeAsSeen(badge.badge_id, badge.earned_at, seenBadgesRef.current);
            }
          });
          debugCelebration("Initialized with existing badges", {
            existingCount: existingBadges.length,
            totalSeen: seenBadgesRef.current.size
          });
        }
      } catch (err) {
        console.error('[BADGE_CELEBRATION] Error initializing seen badges:', err);
      }

      // Subscribe to realtime INSERT events on user_badges AFTER initializing
      // Use a unique channel name that includes a timestamp to avoid conflicts
      const channelName = `user-badges-${userId}-${Date.now()}`;

      // Record subscription start time - only celebrate badges earned AFTER this moment
      // This prevents celebrating old badges on page load/refresh
      subscriptionStartTimeRef.current = new Date().toISOString();
      debugCelebration("Subscription start time set", { startTime: subscriptionStartTimeRef.current });

      channelRef.current = supabaseBrowser
        .channel(channelName)
        .on<UserBadgeInsert>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_badges',
            filter: `user_id=eq.${userId}`,
          },
          async (payload: RealtimePostgresInsertPayload<UserBadgeInsert>) => {
            const newRow = payload.new;
            const key = `${newRow.badge_id}_${newRow.earned_at}`;

            debugCelebration("Received INSERT event", {
              badgeId: newRow.badge_id,
              earnedAt: newRow.earned_at,
              key,
              subscriptionStartTime: subscriptionStartTimeRef.current
            });

            // CRITICAL: Only celebrate badges earned AFTER the subscription started
            // This prevents celebrating old badges on page load/refresh (the main bug fix)
            if (subscriptionStartTimeRef.current && newRow.earned_at < subscriptionStartTimeRef.current) {
              debugCelebration("BADGE_CELEBRATION_SKIPPED", {
                badgeId: newRow.badge_id,
                reason: "earned_before_subscription",
                earnedAt: newRow.earned_at,
                subscriptionStart: subscriptionStartTimeRef.current
              });
              // Mark as seen to prevent future attempts
              markBadgeAsSeen(newRow.badge_id, newRow.earned_at, seenBadgesRef.current);
              return;
            }

            // Additional safeguard: Only celebrate if the earned_at is very recent.
            // This avoids triggering celebrations for historical or delayed inserts
            // even if they happen to arrive after subscription start.
            const earnedTimeMs = Date.parse(newRow.earned_at);
            if (!Number.isNaN(earnedTimeMs)) {
              const ageMs = Date.now() - earnedTimeMs;
              if (ageMs > CELEBRATION_RECENCY_WINDOW_MS) {
                debugCelebration("BADGE_CELEBRATION_SKIPPED", {
                  badgeId: newRow.badge_id,
                  reason: "earned_too_old",
                  ageMs,
                  recencyWindowMs: CELEBRATION_RECENCY_WINDOW_MS
                });
                markBadgeAsSeen(newRow.badge_id, newRow.earned_at, seenBadgesRef.current);
                return;
              }
            }

            // GRACE PERIOD: Block ALL celebrations for a window after initialization.
            // This is the primary defense against page-load celebrations caused by
            // race conditions between the realtime event, suppression state, and
            // the localStorage seen-badge write from checkAndAwardEligibleBadges.
            const timeSinceInit = Date.now() - initCompletedAtRef.current;
            if (initCompletedAtRef.current > 0 && timeSinceInit < INIT_GRACE_PERIOD_MS) {
              debugCelebration("BADGE_CELEBRATION_SKIPPED", {
                badgeId: newRow.badge_id,
                reason: "init_grace_period",
                timeSinceInitMs: timeSinceInit,
                gracePeriodMs: INIT_GRACE_PERIOD_MS
              });
              markBadgeAsSeen(newRow.badge_id, newRow.earned_at, seenBadgesRef.current);
              return;
            }

            // Refresh in-memory seen badges from localStorage before checking.
            // This catches badges marked as seen by markBadgeAsSeenInStorage()
            // (called from checkAndAwardEligibleBadges) which only writes to
            // localStorage, not the in-memory ref. Without this refresh, badges
            // awarded during routine badge checks (e.g. journal save triggering
            // a Live Witness award) would slip through and celebrate at the wrong time.
            seenBadgesRef.current = getSeenBadgesFromStorage();

            // Skip if we've already seen this badge (prevents duplicates on reconnect/refresh)
            if (isBadgeSeen(newRow.badge_id, newRow.earned_at, seenBadgesRef.current)) {
              debugCelebration("BADGE_CELEBRATION_SKIPPED_DUP", {
                badgeId: newRow.badge_id,
                reason: "already_seen"
              });
              return;
            }

            // CRITICAL FIX: Check suppression BEFORE marking as seen
            // If suppressed, queue the badge for later (don't mark as seen yet).
            // Exception: the onboarding reward sequence (utils/onboardingSequence.ts)
            // explicitly awaits this exact celebration via the badge:celebration-complete
            // event immediately after tour completion/skip — which is always still inside
            // the tour's 60s suppression window (contexts/TourContext.tsx's start()).
            // Deferring it there meant the pending badge would later be silently marked
            // "seen" (never celebrated) when suppression auto-cleared, and the reward
            // sequence's wait would just time out. Bypass suppression in that case.
            if (areBadgeCelebrationsSuppressed() && !isOnboardingSequenceActive()) {
              // Add to pending queue (keyed by badge_id to prevent duplicates)
              if (!pendingBadgesRef.current.has(newRow.badge_id)) {
                pendingBadgesRef.current.set(newRow.badge_id, {
                  badgeId: newRow.badge_id,
                  earnedAt: newRow.earned_at,
                  rowId: newRow.id,
                });
                debugCelebration("BADGE_CELEBRATION_DEFERRED", {
                  badgeId: newRow.badge_id,
                  reason: "suppressed - queued for later",
                  pendingCount: pendingBadgesRef.current.size
                });
              } else {
                debugCelebration("BADGE_CELEBRATION_SKIPPED_DUP", {
                  badgeId: newRow.badge_id,
                  reason: "already_in_pending_queue"
                });
              }
              return;
            }

            // Not suppressed - process immediately
            await processBadgeCelebration(newRow.badge_id, newRow.earned_at, newRow.id);
          }
        )
        .subscribe((status) => {
          debugCelebration("Subscription status", { status, channelName });
        });

      // Helper function to process a badge celebration
      async function processBadgeCelebration(badgeId: string, earnedAt: string, rowId: string) {
        // Re-check if already seen (in case another tab celebrated it)
        if (isBadgeSeen(badgeId, earnedAt, seenBadgesRef.current)) {
          debugCelebration("BADGE_CELEBRATION_SKIPPED_DUP", {
            badgeId,
            reason: "already_seen_on_process"
          });
          return;
        }

        // Batch window: only celebrate the first badge when multiple unlock rapidly
        const now = Date.now();
        const timeSinceLastBadge = now - lastBadgeQueuedTimeRef.current;
        if (timeSinceLastBadge < BATCH_WINDOW_MS && lastBadgeQueuedTimeRef.current > 0) {
          // Another badge was just queued - skip this one to avoid celebration spam
          // But still mark as seen so it doesn't replay
          skippedInBatchRef.current.add(badgeId);
          markBadgeAsSeen(badgeId, earnedAt, seenBadgesRef.current);
          debugCelebration("BADGE_CELEBRATION_SKIPPED_BATCH", {
            badgeId,
            timeSinceLastMs: timeSinceLastBadge,
            reason: "batch_window",
            totalSkippedInBatch: skippedInBatchRef.current.size
          });
          return;
        }

        // Fetch badge details from public.badges
        const { data: badge, error } = await supabaseBrowser
          .from('badges')
          .select('id, badge_name, icon_url, heart_coins')
          .eq('id', badgeId)
          .single();

        if (error || !badge) {
          console.error('[BADGE_CELEBRATION] Failed to fetch badge details:', error);
          return;
        }

        const celebrationItem: BadgeCelebrationItem = {
          id: rowId,
          badgeId: badge.id,
          badgeName: badge.badge_name,
          iconUrl: badge.icon_url || '/elements/badge-default.webp',
          heartCoins: badge.heart_coins ?? 0,
          earnedAt: earnedAt,
        };

        debugCelebration("BADGE_CELEBRATION_ENQUEUE", {
          badge_id: celebrationItem.badgeId,
          badge_name: celebrationItem.badgeName,
          earned_at: celebrationItem.earnedAt
        });

        // Update batch window timestamp - this badge will be celebrated
        lastBadgeQueuedTimeRef.current = Date.now();
        // Clear skipped badges from any previous batch
        skippedInBatchRef.current.clear();

        // Mark as seen NOW (right before adding to celebration queue)
        markBadgeAsSeen(badgeId, earnedAt, seenBadgesRef.current);

        // Add to queue
        setQueue((prev) => {
          // Double-check we don't already have this item in queue
          const alreadyInQueue = prev.some(item =>
            item.badgeId === celebrationItem.badgeId &&
            item.earnedAt === celebrationItem.earnedAt
          );
          if (alreadyInQueue) {
            debugCelebration("BADGE_CELEBRATION_SKIPPED_DUP", {
              badgeId: celebrationItem.badgeId,
              reason: "already_in_queue"
            });
            return prev;
          }
          return [...prev, celebrationItem];
        });
      }

      // Subscribe to suppression end event - mark pending badges as seen without celebrating.
      // Badges earned during suppression (e.g., journal flow, tour) should not auto-celebrate
      // when suppression ends, as this causes unexpected delayed celebrations.
      unsubscribeSuppressionRef.current = onSuppressionEnd(() => {
        debugCelebration("Suppression ended, marking pending badges as seen (no celebration)", {
          pendingCount: pendingBadgesRef.current.size
        });

        // Mark all pending badges as seen so they won't re-trigger on refresh
        const pendingBadges = Array.from(pendingBadgesRef.current.values());
        pendingBadgesRef.current.clear();

        for (const pending of pendingBadges) {
          markBadgeAsSeen(pending.badgeId, pending.earnedAt, seenBadgesRef.current);
          debugCelebration("BADGE_MARKED_SEEN_ON_SUPPRESSION_END", {
            badgeId: pending.badgeId
          });
        }
      });

      subscribedUserIdRef.current = userId;
      initializingRef.current = false;
      initCompletedAtRef.current = Date.now();
      debugCelebration("Initialization complete, grace period started", {
        gracePeriodMs: INIT_GRACE_PERIOD_MS
      });
    };

    initializeSeenBadges();

    // Cleanup on unmount or userId change
    return () => {
      if (channelRef.current) {
        debugCelebration("Cleaning up channel on unmount");
        supabaseBrowser.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      // Unsubscribe from suppression end listener
      if (unsubscribeSuppressionRef.current) {
        unsubscribeSuppressionRef.current();
        unsubscribeSuppressionRef.current = null;
      }
      // Clear pending badges
      pendingBadgesRef.current.clear();
      subscribedUserIdRef.current = null;
      initializingRef.current = false;
      subscriptionStartTimeRef.current = null;
      initCompletedAtRef.current = 0;
    };
  }, [userId]);

  // Log queue state changes
  useEffect(() => {
    debugCelebration("CELEBRATION_QUEUE_STATE", {
      len: queue.length,
      active: queue.length > 0 ? queue[0]?.badgeName : null
    });
  }, [queue]);

  return {
    next: queue[0] ?? null,
    pop,
    queueLength: queue.length,
  };
}
