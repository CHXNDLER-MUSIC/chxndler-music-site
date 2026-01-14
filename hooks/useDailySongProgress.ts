/**
 * useDailySongProgress - Track daily song listening progress
 *
 * Source of truth: HTMLAudioElement (currentTime, duration, paused)
 *
 * Uses RPC record_song_play to insert a new row per play event.
 * Each call inserts a NEW row with incrementing play_number for that user+song+day.
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

// Slug-to-song cache (includes id and name) to avoid repeated DB lookups
interface SongInfo {
  id: string;
  name: string;
}
const songInfoCache = new Map<string, SongInfo>();

// Track when we last recorded a play for debouncing
// Key: "songId:day" -> timestamp of last record_song_play call
const lastRecordTimeCache = new Map<string, number>();
const RECORD_DEBOUNCE_MS = 10000; // Minimum 10 seconds between record_song_play calls

// In-flight RPC tracking to prevent duplicate concurrent calls
const inFlightRpcs = new Set<string>();

// Track if we've already recorded a play for this session (songId:day)
const playRecordedThisSession = new Set<string>();

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
  const playRecordedRef = useRef<boolean>(false); // Track if play was recorded for current track

  // Refs for detecting song repeats
  const prevCurrentTimeRef = useRef<number>(0);
  const playSessionKeyRef = useRef<string | null>(null); // "songId:day" for current session

  // Guard refs for bonus quest completion (keyed by NY date)
  const completedDailySongQuestRef = useRef<Record<string, boolean>>({});
  const prevCompletedStateRef = useRef<Record<string, boolean>>({});

  // Guard ref for Song of the Day RPC - prevents duplicate calls per session per day
  const sotdCompletionFiredRef = useRef<Record<string, boolean>>({});

  // Lookup song UUID and name from slug
  const getSongInfo = useCallback(async (slug: string): Promise<SongInfo | null> => {
    // Check cache first
    if (songInfoCache.has(slug)) {
      return songInfoCache.get(slug)!;
    }

    try {
      const { data, error } = await supabaseBrowser
        .from('songs')
        .select('id, title')
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

      const songInfo: SongInfo = { id: data.id, name: data.title || slug };
      songInfoCache.set(slug, songInfo);
      return songInfo;
    } catch (err) {
      console.error('[DailySongProgress] Error looking up song info:', err);
      return null;
    }
  }, []);

  // Check if already completed for this song/day (from DB)
  const checkExistingCompletion = useCallback(async (
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
        .eq('completed', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[DailySongProgress] Error checking existing completion:', error.message);
        return false;
      }

      if (data?.completed) {
        completedRef.current.add(cacheKey);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[DailySongProgress] Exception checking existing completion:', err);
      return false;
    }
  }, []);

  // Record song play via RPC - inserts a new row each time
  const recordSongPlayRpc = useCallback(async (
    songId: string,
    songName: string,
    listenedSeconds: number,
    durationSeconds: number,
    completionPercent: number,
    markCompleted: boolean
  ): Promise<{ success: boolean; playNumber?: number }> => {
    const day = getTodayNY();
    const cacheKey = `${songId}:${day}`;

    // Prevent duplicate concurrent RPC calls
    if (inFlightRpcs.has(cacheKey)) {
      console.log('[DailySongProgress] RPC already in-flight for this song/day, skipping');
      return { success: true };
    }

    // Debounce check - prevent rapid-fire calls
    const now = Date.now();
    const lastRecordTime = lastRecordTimeCache.get(cacheKey) || 0;
    if (now - lastRecordTime < RECORD_DEBOUNCE_MS && !markCompleted) {
      console.log('[DailySongProgress] Debouncing record_song_play, skipping');
      return { success: true };
    }

    // Validate inputs
    if (!isFinite(listenedSeconds) || !isFinite(durationSeconds) || !isFinite(completionPercent)) {
      console.log('[DailySongProgress] Skipping record - invalid values detected');
      return { success: false };
    }

    // Ensure integers for seconds
    const safeListenedSeconds = Math.floor(Math.max(0, listenedSeconds));
    const safeDurationSeconds = Math.floor(Math.max(1, durationSeconds));

    // Clamp completion_percent to 0-100
    const safePercent = Math.min(100, Math.max(0, Number(completionPercent.toFixed(2))));

    if (!isFinite(safePercent)) {
      console.log('[DailySongProgress] Skipping record - safePercent is invalid');
      return { success: false };
    }

    inFlightRpcs.add(cacheKey);
    lastRecordTimeCache.set(cacheKey, now);

    try {
      console.log('[DailySongProgress] Calling record_song_play RPC:', {
        p_song_id: songId,
        p_song_name: songName,
        p_listened_seconds: safeListenedSeconds,
        p_duration_seconds: safeDurationSeconds,
        p_completion_percent: safePercent,
        p_completed: markCompleted
      });

      const { data, error } = await supabaseBrowser.rpc('record_song_play', {
        p_song_id: songId,
        p_listened_seconds: safeListenedSeconds,
        p_duration_seconds: safeDurationSeconds,
        p_completion_percent: safePercent,
        p_completed: markCompleted,
        p_song_name: songName
      });

      console.log('[DailySongProgress] record_song_play RPC response:', { data, error });

      if (error) {
        console.error('[DailySongProgress] record_song_play RPC error:', {
          message: error.message,
          code: (error as any)?.code,
          details: (error as any)?.details
        });
        return { success: false };
      }

      if (data?.success === true) {
        console.log('[DailySongProgress] record_song_play successful, play_number:', data.play_number);
        playRecordedThisSession.add(cacheKey);
        return { success: true, playNumber: data.play_number };
      }

      if (data?.error) {
        console.error('[DailySongProgress] record_song_play returned error:', data.error);
        return { success: false };
      }

      // Unknown response format but no error - treat as success
      console.log('[DailySongProgress] record_song_play response (unknown format):', data);
      return { success: true };
    } catch (err) {
      console.error('[DailySongProgress] record_song_play RPC exception:', err);
      return { success: false };
    } finally {
      inFlightRpcs.delete(cacheKey);
    }
  }, []);

  // Complete Song of the Day via RPC - awards HeartCoin and marks quest complete
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

      // Get song info (UUID and name) from slug
      const songInfo = await getSongInfo(trackSlug);
      if (!songInfo) return;

      const { id: songId, name: songName } = songInfo;
      currentSongIdRef.current = songId;
      const day = getTodayNY();

      // Check if this is a new song/day combination (reset play session)
      const newSessionKey = `${songId}:${day}`;
      const isNewSongOrDay = playSessionKeyRef.current !== newSessionKey;

      if (isNewSongOrDay) {
        playSessionKeyRef.current = newSessionKey;
        prevCurrentTimeRef.current = 0;
        playRecordedRef.current = false;
        console.log(`[DailySongProgress] Starting session for ${trackSlug} on ${day}`);
      }

      const cacheKey = `${songId}:${day}`;

      // Check if already completed this song today
      const alreadyCompleted = await checkExistingCompletion(userId, songId, day);
      if (alreadyCompleted) {
        prevCompletedStateRef.current[day] = true;
        completedDailySongQuestRef.current[day] = true;
        console.log(`[DailySongProgress] ${trackSlug} already completed today`);
      }

      // Mark today's initial state as "not completed" so we can detect false->true transition
      if (prevCompletedStateRef.current[day] === undefined) {
        prevCompletedStateRef.current[day] = false;
      }

      // IMMEDIATE initial record: Record play when playback starts
      const { currentTime: initialTime, duration: initialDuration } = audioElement;
      if (!playRecordedRef.current && initialDuration && initialDuration > 0 && isFinite(initialDuration)) {
        const initialPercent = (initialTime / initialDuration) * 100;
        const result = await recordSongPlayRpc(
          songId,
          songName,
          initialTime,
          initialDuration,
          initialPercent,
          false // Don't mark completed yet
        );
        if (result.success) {
          lastUpdateRef.current = Date.now();
          playRecordedRef.current = true;
          prevCurrentTimeRef.current = initialTime;
        }
      }

      // Start tracking interval (1s) - only for completion detection
      intervalId = window.setInterval(async () => {
        if (!mounted) return;
        if (!audioElement) return;
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;

        try {
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
            prevCurrentTimeRef.current = currentTime;

            // Record new play on restart
            const initialPercent = (currentTime / duration) * 100;
            await recordSongPlayRpc(
              songId,
              songName,
              currentTime,
              duration,
              initialPercent,
              false
            );
            lastUpdateRef.current = Date.now();
            return;
          }

          // Update previous time for next iteration
          prevCurrentTimeRef.current = currentTime;

          // Calculate completion percentage
          const completionPercent = (currentTime / duration) * 100;

          // Check if we've hit the 50% threshold for this song today
          const shouldComplete = completionPercent >= 50 && !completedRef.current.has(cacheKey);

          // Only call RPC when reaching completion threshold
          if (shouldComplete) {
            console.log(`[DailySongProgress] 50% threshold reached for ${trackSlug}`);

            const result = await recordSongPlayRpc(
              songId,
              songName,
              currentTime,
              duration,
              completionPercent,
              true // Mark completed
            );

            if (result.success) {
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
    getSongInfo,
    checkExistingCompletion,
    recordSongPlayRpc,
    completeSongOfDayIfEligible
  ]);

  // Also track on 'timeupdate' events for more accurate progress
  useEffect(() => {
    if (!enabled) return;
    if (!audioElement) return;
    if (!trackSlug) return;

    const handleTimeUpdate = () => {
      // This event fires frequently - actual tracking is handled by the interval
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [enabled, audioElement, trackSlug]);
}

export default useDailySongProgress;
