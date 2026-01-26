'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { areBadgeCelebrationsSuppressed } from '@/utils/celebrationQueue';

// ============================================================================
// DEBUG FLAG - Toggle to enable/disable debug logging
// ============================================================================
const DEBUG_CELEBRATIONS = true; // Set to false in production

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
// Batch Window - Only celebrate first badge when multiple unlock at once
// ============================================================================
const BATCH_WINDOW_MS = 2000; // 2 second window to group rapid unlocks

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

// ============================================================================
// Main Hook
// ============================================================================

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

  const pop = useCallback(() => {
    setQueue((prev) => prev.slice(1));
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

            // Skip if we've already seen this badge (prevents duplicates on reconnect/refresh)
            if (isBadgeSeen(newRow.badge_id, newRow.earned_at, seenBadgesRef.current)) {
              debugCelebration("BADGE_CELEBRATION_SKIPPED_DUP", {
                badgeId: newRow.badge_id,
                reason: "already_seen"
              });
              return;
            }

            // Mark as seen immediately to prevent duplicate processing
            markBadgeAsSeen(newRow.badge_id, newRow.earned_at, seenBadgesRef.current);

            // If celebrations are suppressed (e.g., during initial load), skip enqueuing
            if (areBadgeCelebrationsSuppressed()) {
              debugCelebration("BADGE_CELEBRATION_SKIPPED_DUP", {
                badgeId: newRow.badge_id,
                reason: "suppressed"
              });
              return;
            }

            // Batch window: only celebrate the first badge when multiple unlock rapidly
            const now = Date.now();
            const timeSinceLastBadge = now - lastBadgeQueuedTimeRef.current;
            if (timeSinceLastBadge < BATCH_WINDOW_MS && lastBadgeQueuedTimeRef.current > 0) {
              // Another badge was just queued - skip this one to avoid celebration spam
              skippedInBatchRef.current.add(newRow.badge_id);
              debugCelebration("BADGE_CELEBRATION_SKIPPED_BATCH", {
                badgeId: newRow.badge_id,
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
              .eq('id', newRow.badge_id)
              .single();

            if (error || !badge) {
              console.error('[BADGE_CELEBRATION] Failed to fetch badge details:', error);
              return;
            }

            const celebrationItem: BadgeCelebrationItem = {
              id: newRow.id,
              badgeId: badge.id,
              badgeName: badge.badge_name,
              iconUrl: badge.icon_url || '/elements/badge-default.webp',
              heartCoins: badge.heart_coins ?? 0,
              earnedAt: newRow.earned_at,
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
        )
        .subscribe((status) => {
          debugCelebration("Subscription status", { status, channelName });
        });

      subscribedUserIdRef.current = userId;
      initializingRef.current = false;
    };

    initializeSeenBadges();

    // Cleanup on unmount or userId change
    return () => {
      if (channelRef.current) {
        debugCelebration("Cleaning up channel on unmount");
        supabaseBrowser.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      subscribedUserIdRef.current = null;
      initializingRef.current = false;
      subscriptionStartTimeRef.current = null;
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
