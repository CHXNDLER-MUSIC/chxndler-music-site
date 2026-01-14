/**
 * useDailySongProgress - Track daily song listening progress
 *
 * Source of truth: HTMLAudioElement (currentTime, duration, paused)
 *
 * Tracks:
 * - listened_seconds (from currentTime)
 * - duration_seconds
 * - completion_percent
 * - completed (true when >= 50%)
 * - completed_at (timestamp when first completed)
 * - play_count (number of times song was played today)
 *
 * Uses UPSERT strategy with unique constraint on (user_id, song_id, day).
 * HeartCoin rewards are handled by separate RPC (complete_song_of_day_once_per_day).
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface UseDailySongProgressOptions {
  audioElement: HTMLAudioElement | null;
  trackSlug: string | null;
  isPlaying: boolean;
  enabled?: boolean;
  songOfDaySlug?: string | null; // Only award HeartCoin if playing Song of the Day
  songOfDayId?: string | null; // Canonical song_id from element_of_day table
}

// Helper: Get current date in NY timezone as YYYY-MM-DD
function getTodayNY(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

// Slug-to-UUID cache to avoid repeated DB lookups
const songIdCache = new Map<string, string>();

// Track which upserts we've already done for this session to avoid duplicate calls
// Key: "userId:songId:day"
const upsertedRowsCache = new Set<string>();

// Debounce tracking - prevents multiple rapid upserts
const lastUpsertTimeCache = new Map<string, number>();
const UPSERT_DEBOUNCE_MS = 3000; // Minimum 3 seconds between upserts for same song/day

export function useDailySongProgress({
  audioElement,
  trackSlug,
  isPlaying,
  enabled = true,
  songOfDaySlug = null,
  songOfDayId = null
}: UseDailySongProgressOptions) {
  // Track completion state per song per day to prevent double-awards
  const completedRef = useRef<Set<string>>(new Set()); // Set of "songId:day" keys
  const lastUpdateRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const currentSongIdRef = useRef<string | null>(null);
  const initialRowCreatedRef = useRef<boolean>(false); // Track if initial row was created for current track

  // Refs for detecting song repeats
  const prevCurrentTimeRef = useRef<number>(0);
  const playSessionKeyRef = useRef<string | null>(null); // "songId:day" for current session

  // Guard refs for bonus quest completion (keyed by NY date)
  // Prevents multiple RPC calls even on rerenders or duplicate effect triggers
  const completedDailySongQuestRef = useRef<Record<string, boolean>>({});
  const prevCompletedStateRef = useRef<Record<string, boolean>>({}); // Track previous completed state per day

  // Guard ref for Song of the Day RPC - prevents duplicate calls per session per day
  const sotdCompletionFiredRef = useRef<Record<string, boolean>>({});

  // Lookup song UUID from slug
  const getSongId = useCallback(async (slug: string): Promise<string | null> => {
    // Check cache first
    if (songIdCache.has(slug)) {
      return songIdCache.get(slug)!;
    }

    try {
      const { data, error } = await supabaseBrowser
        .from('songs')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.error(`[DailySongProgress] Error fetching song for slug "${slug}":`, error.message);
        return null;
      }

      if (!data) {
        console.warn(`[DailySongProgress] Song not found for slug "${slug}"`);
        return null;
      }

      // Cache the result
      songIdCache.set(slug, data.id);
      return data.id;
    } catch (err) {
      console.error('[DailySongProgress] Error looking up song ID:', err);
      return null;
    }
  }, []);

  // Check if already completed for this song/day (from DB)
  const checkExistingProgress = useCallback(async (
    userId: string,
    songId: string,
    day: string
  ): Promise<boolean> => {
    const cacheKey = `${songId}:${day}`;

    // If we already know it's completed, skip DB check
    if (completedRef.current.has(cacheKey)) {
      return true;
    }

    try {
      const { data, error } = await supabaseBrowser
        .from('user_song_daily_progress')
        .select('completed')
        .eq('user_id', userId)
        .eq('song_id', songId)
        .eq('day', day)
        .maybeSingle();

      if (error) {
        console.warn('[DailySongProgress] Error checking existing progress:', error.message);
        return false;
      }

      // Row may not exist yet - that's okay
      if (data?.completed) {
        completedRef.current.add(cacheKey);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[DailySongProgress] Exception checking existing progress:', err);
      return false;
    }
  }, []);

  // UPSERT a progress row - creates if not exists, updates if exists
  // Uses onConflict on (user_id, song_id, day) to avoid 409 errors
  const upsertProgress = useCallback(async (
    userId: string,
    songId: string,
    day: string,
    listenedSeconds: number,
    durationSeconds: number,
    completionPercent: number,
    markCompleted: boolean,
    incrementPlayCount: boolean = false
  ): Promise<boolean> => {
    const cacheKey = `${userId}:${songId}:${day}`;

    // Debounce check - prevent rapid-fire upserts
    const now = Date.now();
    const lastUpsertTime = lastUpsertTimeCache.get(cacheKey) || 0;
    if (now - lastUpsertTime < UPSERT_DEBOUNCE_MS && !markCompleted) {
      // Skip this upsert unless it's marking completion (which is important)
      console.log('[DailySongProgress] Debouncing upsert, skipping');
      return true; // Return true to not trigger error handling
    }
    lastUpsertTimeCache.set(cacheKey, now);

    try {
      // Auth guard: Verify user is authenticated
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.user?.id) {
        console.log('[DailySongProgress] No session, skipping upsert');
        return false;
      }

      // Double-check userId matches authenticated user
      if (userId !== session.user.id) {
        console.warn('[DailySongProgress] userId mismatch, using auth user.id');
        userId = session.user.id;
      }

      // Validate inputs
      if (!isFinite(listenedSeconds) || !isFinite(durationSeconds) || !isFinite(completionPercent)) {
        console.log('[DailySongProgress] Skipping upsert - invalid values detected');
        return false;
      }

      // Ensure integers
      const safeDurationSeconds = Math.floor(durationSeconds);
      const safeListenedSeconds = Math.floor(listenedSeconds);

      // Fix numeric overflow: completion_percent must be 0-100
      const rawPercent = (safeListenedSeconds / safeDurationSeconds) * 100;
      const safePercent = Math.min(100, Math.max(0, Number(rawPercent.toFixed(2))));

      if (!isFinite(safePercent)) {
        console.log('[DailySongProgress] Skipping upsert - safePercent is invalid');
        return false;
      }

      const timestamp = new Date().toISOString();

      // Build the upsert data
      const upsertData: Record<string, unknown> = {
        user_id: userId,
        song_id: songId,
        day,
        listened_seconds: safeListenedSeconds,
        duration_seconds: safeDurationSeconds,
        completion_percent: safePercent,
        updated_at: timestamp
      };

      // Only set started_at on first insert (will be ignored on update due to onConflict)
      if (!upsertedRowsCache.has(cacheKey)) {
        upsertData.started_at = timestamp;
      }

      if (markCompleted) {
        upsertData.completed = true;
        upsertData.completed_at = timestamp;
      }

      console.log('[DailySongProgress] Upserting progress:', {
        songId,
        day,
        listenedSeconds: safeListenedSeconds,
        completionPercent: safePercent,
        markCompleted
      });

      // Perform the UPSERT with onConflict on the unique constraint columns
      const { error } = await supabaseBrowser
        .from('user_song_daily_progress')
        .upsert(upsertData, {
          onConflict: 'user_id,song_id,day',
          ignoreDuplicates: false // We want to update on conflict, not ignore
        });

      if (error) {
        console.error('[DailySongProgress] Upsert error:', {
          message: error.message,
          code: (error as any)?.code,
          details: (error as any)?.details
        });
        return false;
      }

      console.log('[DailySongProgress] Upsert successful for', day);

      // Mark as upserted in cache
      upsertedRowsCache.add(cacheKey);

      // If we need to increment play_count, do a separate update
      if (incrementPlayCount) {
        const { error: updateError } = await supabaseBrowser
          .from('user_song_daily_progress')
          .update({
            play_count: supabaseBrowser.rpc('increment_play_count_raw', { val: 1 }) as any,
            updated_at: timestamp
          })
          .eq('user_id', userId)
          .eq('song_id', songId)
          .eq('day', day);

        if (updateError) {
          // play_count increment failed - not critical, just log it
          console.warn('[DailySongProgress] play_count increment failed:', updateError.message);
          // Try direct increment as fallback
          await supabaseBrowser.rpc('increment_song_play_count', {
            p_user_id: userId,
            p_song_id: songId,
            p_day: day
          }).catch(() => {
            // RPC may not exist, that's okay
          });
        }
      }

      return true;
    } catch (err) {
      console.error('[DailySongProgress] Exception during upsert:', err);
      return false;
    }
  }, []);

  // Complete Song of the Day via RPC - awards HeartCoin and marks quest complete
  // Called exactly once per app session per day when 50% threshold is reached
  const completeSongOfDayIfEligible = useCallback(async (
    songId: string,
    day: string
  ): Promise<boolean> => {
    const guardKey = `${songId}:${day}`;

    // Guard: prevent duplicate calls per session per day
    if (sotdCompletionFiredRef.current[guardKey]) {
      console.log('[DailySongProgress] Song of Day RPC already fired for today, skipping');
      return false;
    }

    // Mark as fired BEFORE the RPC call to prevent race conditions
    sotdCompletionFiredRef.current[guardKey] = true;

    try {
      console.log('[DailySongProgress] Calling complete_song_of_day_once_per_day RPC with song_id:', songId);

      const { data, error } = await supabaseBrowser.rpc('complete_song_of_day_once_per_day', {
        p_song_id: songId
      });

      console.log('[DailySongProgress] Song of Day RPC result:', { data, error });

      if (error) {
        console.error('[DailySongProgress] Song of Day RPC error:', {
          message: error?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code,
        });
        return false;
      }

      if (data?.ok === true) {
        console.log('[DailySongProgress] Song of Day completed successfully!');

        if (data?.heartcoin_awarded === true) {
          const { triggerHeartCoinCelebration } = await import('@/utils/heartcoinCelebration');
          triggerHeartCoinCelebration(1);
          console.log('[DailySongProgress] HeartCoin celebration triggered');
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dailySongQuestCompleted', {
            detail: { day, awarded: data?.heartcoin_awarded, status: 'completed' }
          }));
          window.dispatchEvent(new CustomEvent('profile:force-refresh'));
          window.dispatchEvent(new CustomEvent('relics:refresh'));
        }

        prevCompletedStateRef.current[day] = true;
        completedDailySongQuestRef.current[day] = true;

        return true;
      } else if (data?.ok === false && data?.reason === 'not_song_of_day') {
        console.log('[DailySongProgress] Song is not the Song of the Day, skipping');
        return false;
      } else if (data?.ok === false && data?.reason === 'already_completed') {
        console.log('[DailySongProgress] Song of Day already completed today');
        prevCompletedStateRef.current[day] = true;
        completedDailySongQuestRef.current[day] = true;
        return false;
      } else {
        console.warn('[DailySongProgress] Unexpected Song of Day RPC response:', data);
        return false;
      }
    } catch (err) {
      console.error('[DailySongProgress] Song of Day RPC exception:', err);
      return false;
    }
  }, []);

  // Main progress tracking effect
  useEffect(() => {
    if (!enabled) return;
    if (!audioElement) return;
    if (!trackSlug) return;
    if (!isPlaying) return;

    let intervalId: number | null = null;
    let mounted = true;

    const trackProgress = async () => {
      if (!mounted) return;

      // Get current user - skip silently if not authenticated
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.user?.id) {
        return;
      }
      const userId = session.user.id;

      console.log('[DailySongProgress] Starting track progress', {
        userId,
        trackSlug,
        isPlaying
      });

      // Get song UUID from slug
      const songId = await getSongId(trackSlug);
      if (!songId) return;

      currentSongIdRef.current = songId;
      const day = getTodayNY();

      // Check if this is a new song/day combination (reset play session)
      const newSessionKey = `${songId}:${day}`;
      const isNewSongOrDay = playSessionKeyRef.current !== newSessionKey;

      if (isNewSongOrDay) {
        playSessionKeyRef.current = newSessionKey;
        prevCurrentTimeRef.current = 0;
        initialRowCreatedRef.current = false;
        console.log(`[DailySongProgress] Starting session for ${trackSlug} on ${day}`);
      }

      const cacheKey = `${songId}:${day}`;

      // Check if already completed this song today
      const alreadyCompleted = await checkExistingProgress(userId, songId, day);
      if (alreadyCompleted) {
        prevCompletedStateRef.current[day] = true;
        completedDailySongQuestRef.current[day] = true;
        console.log(`[DailySongProgress] ${trackSlug} already completed today`);
        // Still continue tracking for play_count increment
      }

      // Mark today's initial state as "not completed" so we can detect false->true transition
      if (prevCompletedStateRef.current[day] === undefined) {
        prevCompletedStateRef.current[day] = false;
      }

      // IMMEDIATE initial UPSERT: Create/update the row right away when playback starts
      const { currentTime: initialTime, duration: initialDuration } = audioElement;
      const upsertCacheKey = `${userId}:${songId}:${day}`;
      if (!initialRowCreatedRef.current && initialDuration && initialDuration > 0 && isFinite(initialDuration)) {
        const initialPercent = (initialTime / initialDuration) * 100;
        const success = await upsertProgress(
          userId,
          songId,
          day,
          initialTime,
          initialDuration,
          initialPercent,
          false, // Don't mark completed yet
          isNewSongOrDay // Increment play count on new session
        );
        if (success) {
          lastUpdateRef.current = Date.now();
          initialRowCreatedRef.current = true;
          prevCurrentTimeRef.current = initialTime;
        }
      }

      // Start tracking interval (1s)
      intervalId = window.setInterval(async () => {
        if (!mounted) return;
        if (!audioElement) return;
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;

        try {
          // Source of truth: audio element state
          const { currentTime, duration, paused } = audioElement;

          // Wait for valid duration
          if (!duration || duration <= 0 || isNaN(duration) || !isFinite(duration)) {
            return;
          }

          // Stop tracking if audio is paused
          if (paused) return;

          // DETECT SONG RESTART: currentTime goes from >5s back to <2s
          const prevTime = prevCurrentTimeRef.current;
          const isRestart = prevTime > 5 && currentTime < 2;

          if (isRestart) {
            console.log(`[DailySongProgress] Song restarted for ${trackSlug}`);
            // Song restarted - increment play count
            prevCurrentTimeRef.current = currentTime;

            const initialPercent = (currentTime / duration) * 100;
            await upsertProgress(
              userId,
              songId,
              day,
              currentTime,
              duration,
              initialPercent,
              false,
              true // Increment play count
            );
            lastUpdateRef.current = Date.now();
            return;
          }

          // Update previous time for next iteration
          prevCurrentTimeRef.current = currentTime;

          // Calculate completion percentage
          const completionPercent = (currentTime / duration) * 100;

          // Throttle updates to every 5 seconds minimum
          const now = Date.now();
          const needsInitialRow = !initialRowCreatedRef.current;
          if (!needsInitialRow && now - lastUpdateRef.current < 5000) return;
          lastUpdateRef.current = now;

          // Check if we've hit the 50% threshold for this song today
          const shouldComplete = completionPercent >= 50 && !completedRef.current.has(cacheKey);

          // Upsert progress
          const success = await upsertProgress(
            userId,
            songId,
            day,
            currentTime,
            duration,
            completionPercent,
            shouldComplete,
            needsInitialRow // Only increment play count on first track of session
          );

          if (success && needsInitialRow) {
            initialRowCreatedRef.current = true;
          }

          // Trigger Song of the Day completion if threshold reached
          if (shouldComplete) {
            completedRef.current.add(cacheKey);

            const isSongOfDayById = songOfDayId && songId === songOfDayId;
            const isSongOfDayBySlug = !songOfDayId && songOfDaySlug && trackSlug === songOfDaySlug;
            const isSongOfDay = isSongOfDayById || isSongOfDayBySlug;

            if (isSongOfDay) {
              console.log(`[DailySongProgress] Song of the Day completed for ${trackSlug}`);
              await completeSongOfDayIfEligible(songId, day);
            } else {
              console.log(`[DailySongProgress] Song completed but not Song of the Day`);
            }
          }
        } finally {
          isProcessingRef.current = false;
        }
      }, 1000);
    };

    trackProgress();

    return () => {
      mounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [
    enabled,
    audioElement,
    trackSlug,
    isPlaying,
    songOfDaySlug,
    songOfDayId,
    getSongId,
    checkExistingProgress,
    upsertProgress,
    completeSongOfDayIfEligible
  ]);

  // Also track on 'timeupdate' events for more accurate progress
  useEffect(() => {
    if (!enabled) return;
    if (!audioElement) return;
    if (!trackSlug) return;

    const handleTimeUpdate = () => {
      // This event fires frequently - actual tracking is handled by the interval
      // This is here for potential future use (e.g., more granular tracking)
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [enabled, audioElement, trackSlug]);
}

export default useDailySongProgress;
