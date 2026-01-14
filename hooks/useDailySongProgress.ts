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
 *
 * Uses INSERT-only strategy with incrementing play_number.
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

// Track which rows we've already inserted for this session (to avoid duplicate inserts)
// Key: "userId:songId:day:playNumber"
const insertedRowsCache = new Set<string>();

export function useDailySongProgress({
  audioElement,
  trackSlug,
  isPlaying,
  enabled = true,
  songOfDaySlug = null,
  songOfDayId = null
}: UseDailySongProgressOptions) {
  // Track completion state per song per day to prevent double-awards
  const completedRef = useRef<Set<string>>(new Set()); // Set of "songId:day:playNumber" keys
  const lastUpdateRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const currentSongIdRef = useRef<string | null>(null);
  const initialRowCreatedRef = useRef<boolean>(false); // Track if initial row was created for current track

  // Refs for detecting song repeats
  const prevCurrentTimeRef = useRef<number>(0);
  const currentPlayNumberRef = useRef<number>(1);
  const playSessionKeyRef = useRef<string | null>(null); // "songId:day:playNumber" for current session

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

  // Get the max play_number for a user/song/day from database
  const getMaxPlayNumber = useCallback(async (
    userId: string,
    songId: string,
    day: string
  ): Promise<number> => {
    try {
      const { data, error } = await supabaseBrowser
        .from('user_song_daily_progress')
        .select('play_number')
        .eq('user_id', userId)
        .eq('song_id', songId)
        .eq('day', day)
        .order('play_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[DailySongProgress] Error fetching max play_number:', error.message);
        return 0;
      }

      return data?.play_number ?? 0;
    } catch (err) {
      console.warn('[DailySongProgress] Exception fetching max play_number:', err);
      return 0;
    }
  }, []);

  // Check if already completed for this song/day/playNumber (from DB)
  const checkExistingProgress = useCallback(async (
    userId: string,
    songId: string,
    day: string,
    playNumber: number
  ): Promise<boolean> => {
    const cacheKey = `${songId}:${day}:${playNumber}`;

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
        .eq('play_number', playNumber)
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

  // INSERT a new progress row (with retry on conflict)
  const insertProgress = useCallback(async (
    userId: string,
    songId: string,
    day: string,
    playNumber: number,
    listenedSeconds: number,
    durationSeconds: number,
    completionPercent: number,
    markCompleted: boolean
  ): Promise<{ success: boolean; insertedPlayNumber: number }> => {
    const MAX_RETRIES = 2;
    let currentPlayNumber = playNumber;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Auth guard: Verify user is authenticated
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (!session?.user?.id) {
          return { success: false, insertedPlayNumber: currentPlayNumber };
        }

        // Double-check userId matches authenticated user
        if (userId !== session.user.id) {
          console.warn('[DailySongProgress] userId mismatch, using auth user.id');
          userId = session.user.id;
        }

        // Validate inputs
        if (!isFinite(listenedSeconds) || !isFinite(durationSeconds) || !isFinite(completionPercent)) {
          console.log('[DailySongProgress] Skipping insert - invalid values detected');
          return { success: false, insertedPlayNumber: currentPlayNumber };
        }

        // Ensure integers
        const safeDurationSeconds = Math.floor(durationSeconds);
        const safeListenedSeconds = Math.floor(listenedSeconds);

        // Fix numeric overflow: completion_percent must be 0-100
        const rawPercent = (safeListenedSeconds / safeDurationSeconds) * 100;
        const safePercent = Math.min(100, Math.max(0, Number(rawPercent.toFixed(2))));

        if (!isFinite(safePercent)) {
          console.log('[DailySongProgress] Skipping insert - safePercent is invalid');
          return { success: false, insertedPlayNumber: currentPlayNumber };
        }

        const now = new Date().toISOString();
        const progressData: Record<string, unknown> = {
          user_id: userId,
          song_id: songId,
          day,
          play_number: currentPlayNumber,
          listened_seconds: safeListenedSeconds,
          duration_seconds: safeDurationSeconds,
          completion_percent: safePercent,
          started_at: now,
          updated_at: now
        };

        if (markCompleted) {
          progressData.completed = true;
          progressData.completed_at = now;
        }

        const { error } = await supabaseBrowser
          .from('user_song_daily_progress')
          .insert(progressData);

        if (!error) {
          console.log(`[DailySongProgress] inserted play ${currentPlayNumber} for ${day}`);
          // Cache that we've inserted this row
          insertedRowsCache.add(`${userId}:${songId}:${day}:${currentPlayNumber}`);
          return { success: true, insertedPlayNumber: currentPlayNumber };
        }

        // Check for conflict (duplicate key)
        const errCode = (error as any)?.code || '';
        const errMsg = error.message?.toLowerCase() || '';
        const isConflict = errCode === '23505' || errMsg.includes('duplicate key') || errMsg.includes('unique constraint');

        if (isConflict && attempt < MAX_RETRIES) {
          console.log(`[DailySongProgress] conflict on play_number ${currentPlayNumber}, retrying...`);
          // Re-query max play_number and increment
          const maxPlayNumber = await getMaxPlayNumber(userId, songId, day);
          currentPlayNumber = maxPlayNumber + 1;
          continue;
        }

        // Non-conflict error or max retries exceeded
        console.error('[DailySongProgress] Insert failed:', error.message);
        return { success: false, insertedPlayNumber: currentPlayNumber };

      } catch (err) {
        console.error('[DailySongProgress] Exception during insert:', err);
        return { success: false, insertedPlayNumber: currentPlayNumber };
      }
    }

    return { success: false, insertedPlayNumber: currentPlayNumber };
  }, [getMaxPlayNumber]);

  // UPDATE an existing progress row (for progress updates after initial insert)
  const updateProgress = useCallback(async (
    userId: string,
    songId: string,
    day: string,
    playNumber: number,
    listenedSeconds: number,
    durationSeconds: number,
    completionPercent: number,
    markCompleted: boolean
  ): Promise<boolean> => {
    try {
      // Auth guard
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.user?.id) {
        return false;
      }

      if (userId !== session.user.id) {
        userId = session.user.id;
      }

      // Validate inputs
      if (!isFinite(listenedSeconds) || !isFinite(durationSeconds) || !isFinite(completionPercent)) {
        return false;
      }

      const safeDurationSeconds = Math.floor(durationSeconds);
      const safeListenedSeconds = Math.floor(listenedSeconds);
      const rawPercent = (safeListenedSeconds / safeDurationSeconds) * 100;
      const safePercent = Math.min(100, Math.max(0, Number(rawPercent.toFixed(2))));

      if (!isFinite(safePercent)) {
        return false;
      }

      const updateData: Record<string, unknown> = {
        listened_seconds: safeListenedSeconds,
        duration_seconds: safeDurationSeconds,
        completion_percent: safePercent,
        updated_at: new Date().toISOString()
      };

      if (markCompleted) {
        updateData.completed = true;
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabaseBrowser
        .from('user_song_daily_progress')
        .update(updateData)
        .eq('user_id', userId)
        .eq('song_id', songId)
        .eq('day', day)
        .eq('play_number', playNumber);

      if (error) {
        console.error('[DailySongProgress] Update failed:', error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[DailySongProgress] Exception during update:', err);
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

      if (error) {
        console.error('[DailySongProgress] Song of Day RPC error:', {
          message: error?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code,
        });
        return false;
      }

      console.log('[DailySongProgress] Song of Day RPC result:', data);

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
        // New song or new day - get the next play_number
        const maxPlayNumber = await getMaxPlayNumber(userId, songId, day);
        const nextPlayNumber = maxPlayNumber + 1;
        currentPlayNumberRef.current = nextPlayNumber;
        playSessionKeyRef.current = newSessionKey;
        prevCurrentTimeRef.current = 0;
        initialRowCreatedRef.current = false;
        console.log(`[DailySongProgress] Starting play #${nextPlayNumber} for ${trackSlug} on ${day}`);
      }

      const playNumber = currentPlayNumberRef.current;
      const cacheKey = `${songId}:${day}:${playNumber}`;
      const insertCacheKey = `${userId}:${songId}:${day}:${playNumber}`;

      // If already completed this specific play session, no need to track further
      const alreadyCompleted = await checkExistingProgress(userId, songId, day, playNumber);
      if (alreadyCompleted) {
        prevCompletedStateRef.current[day] = true;
        completedDailySongQuestRef.current[day] = true;
        console.log(`[DailySongProgress] Play #${playNumber} of ${trackSlug} already completed today`);
        return;
      }

      // Mark today's initial state as "not completed" so we can detect false->true transition
      if (prevCompletedStateRef.current[day] === undefined) {
        prevCompletedStateRef.current[day] = false;
      }

      // IMMEDIATE initial INSERT: Create the row right away when playback starts
      const { currentTime: initialTime, duration: initialDuration } = audioElement;
      if (!initialRowCreatedRef.current && !insertedRowsCache.has(insertCacheKey) && initialDuration && initialDuration > 0 && isFinite(initialDuration)) {
        const initialPercent = (initialTime / initialDuration) * 100;
        const result = await insertProgress(userId, songId, day, playNumber, initialTime, initialDuration, initialPercent, false);
        if (result.success) {
          lastUpdateRef.current = Date.now();
          initialRowCreatedRef.current = true;
          prevCurrentTimeRef.current = initialTime;
          // Update play number if it changed due to conflict resolution
          if (result.insertedPlayNumber !== playNumber) {
            currentPlayNumberRef.current = result.insertedPlayNumber;
          }
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
            // Song restarted! Get new play_number and insert new row
            const maxPlayNumber = await getMaxPlayNumber(userId, songId, day);
            const newPlayNumber = maxPlayNumber + 1;
            currentPlayNumberRef.current = newPlayNumber;
            initialRowCreatedRef.current = false;
            prevCurrentTimeRef.current = currentTime;

            console.log(`[DailySongProgress] Song restarted! Starting play #${newPlayNumber} for ${trackSlug}`);

            // Insert new row for the new play session
            const initialPercent = (currentTime / duration) * 100;
            const result = await insertProgress(userId, songId, day, newPlayNumber, currentTime, duration, initialPercent, false);
            if (result.success) {
              lastUpdateRef.current = Date.now();
              initialRowCreatedRef.current = true;
              if (result.insertedPlayNumber !== newPlayNumber) {
                currentPlayNumberRef.current = result.insertedPlayNumber;
              }
            }
            return;
          }

          // Update previous time for next iteration
          prevCurrentTimeRef.current = currentTime;

          const currentPlayNum = currentPlayNumberRef.current;
          const currentCacheKey = `${songId}:${day}:${currentPlayNum}`;
          const currentInsertCacheKey = `${userId}:${songId}:${day}:${currentPlayNum}`;

          // Calculate completion percentage
          const completionPercent = (currentTime / duration) * 100;

          // Throttle updates to every 5 seconds minimum
          const now = Date.now();
          const needsInitialRow = !initialRowCreatedRef.current && !insertedRowsCache.has(currentInsertCacheKey);
          if (!needsInitialRow && now - lastUpdateRef.current < 5000) return;
          lastUpdateRef.current = now;

          // Check if we've hit the 50% threshold for this play session
          const shouldComplete = completionPercent >= 50 && !completedRef.current.has(currentCacheKey);

          // If row doesn't exist yet, INSERT; otherwise UPDATE
          if (needsInitialRow) {
            const result = await insertProgress(
              userId,
              songId,
              day,
              currentPlayNum,
              currentTime,
              duration,
              completionPercent,
              shouldComplete
            );
            if (result.success) {
              initialRowCreatedRef.current = true;
              if (result.insertedPlayNumber !== currentPlayNum) {
                currentPlayNumberRef.current = result.insertedPlayNumber;
              }
            }
          } else {
            // Row already exists - update it
            await updateProgress(
              userId,
              songId,
              day,
              currentPlayNum,
              currentTime,
              duration,
              completionPercent,
              shouldComplete
            );
          }

          // Trigger Song of the Day completion if threshold reached
          if (shouldComplete) {
            completedRef.current.add(currentCacheKey);

            const isSongOfDayById = songOfDayId && songId === songOfDayId;
            const isSongOfDayBySlug = !songOfDayId && songOfDaySlug && trackSlug === songOfDaySlug;
            const isSongOfDay = isSongOfDayById || isSongOfDayBySlug;

            if (isSongOfDay) {
              console.log(`[DailySongProgress] Song of the Day play #${currentPlayNum} completed for ${trackSlug}`);
              await completeSongOfDayIfEligible(songId, day);
            } else {
              console.log(`[DailySongProgress] Play #${currentPlayNum} completed but not Song of the Day`);
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
    getMaxPlayNumber,
    checkExistingProgress,
    insertProgress,
    updateProgress,
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
