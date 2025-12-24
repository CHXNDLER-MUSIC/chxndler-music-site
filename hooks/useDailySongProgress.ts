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
 * Awards HeartCoin once per user per song per day when 50% threshold is reached.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { logHeartcoinTransaction } from '@/utils/heartcoins';

// Types
interface DailyProgressState {
  songId: string | null;       // UUID from songs table
  songSlug: string | null;     // Track slug for lookup
  day: string | null;          // YYYY-MM-DD in NY timezone
  listenedSeconds: number;
  durationSeconds: number;
  completionPercent: number;
  completed: boolean;
  completedAt: string | null;
}

interface UseDailySongProgressOptions {
  audioElement: HTMLAudioElement | null;
  trackSlug: string | null;
  isPlaying: boolean;
  enabled?: boolean;
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

export function useDailySongProgress({
  audioElement,
  trackSlug,
  isPlaying,
  enabled = true
}: UseDailySongProgressOptions) {
  // Track completion state per song per day to prevent double-awards
  const completedRef = useRef<Set<string>>(new Set()); // Set of "songId:day" keys
  const lastUpsertRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const currentSongIdRef = useRef<string | null>(null);

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
        .single();

      if (error || !data) {
        console.log(`🎵 Daily progress: Song not found for slug "${slug}"`);
        return null;
      }

      // Cache the result
      songIdCache.set(slug, data.id);
      return data.id;
    } catch (err) {
      console.error('🎵 Daily progress: Error looking up song ID:', err);
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
        .single();

      if (data?.completed) {
        completedRef.current.add(cacheKey);
        return true;
      }
      return false;
    } catch {
      // No existing record or error - not completed
      return false;
    }
  }, []);

  // Upsert progress to database
  const upsertProgress = useCallback(async (
    userId: string,
    songId: string,
    day: string,
    listenedSeconds: number,
    durationSeconds: number,
    completionPercent: number,
    markCompleted: boolean
  ) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const progressData: any = {
        user_id: userId,
        song_id: songId,
        day,
        listened_seconds: Math.floor(listenedSeconds),
        duration_seconds: Math.floor(durationSeconds),
        completion_percent: Math.round(completionPercent * 100) / 100, // 2 decimal places
        updated_at: new Date().toISOString()
      };

      // Only set completed fields if we're marking as completed
      if (markCompleted) {
        progressData.completed = true;
        progressData.completed_at = new Date().toISOString();
      }

      const { error } = await supabaseBrowser
        .from('user_song_daily_progress')
        .upsert(progressData, {
          onConflict: 'user_id,song_id,day',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('🎵 Daily progress: Upsert failed:', error.message);
      } else {
        console.log(`🎵 Daily progress: Updated - ${Math.floor(completionPercent)}% complete${markCompleted ? ' (COMPLETED!)' : ''}`);
      }
    } catch (err) {
      console.error('🎵 Daily progress: Error upserting:', err);
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  // Award HeartCoin for song completion
  const awardCompletionHeartCoin = useCallback(async (
    userId: string,
    songId: string,
    songSlug: string,
    day: string
  ) => {
    const cacheKey = `${songId}:${day}`;

    // Double-check we haven't already awarded
    if (completedRef.current.has(cacheKey)) {
      console.log('🎵 Daily progress: Already awarded for this song/day');
      return;
    }

    try {
      await logHeartcoinTransaction(supabaseBrowser, {
        user_id: userId,
        amount: 1,
        reason: 'SONG_LISTEN_COMPLETE',
        description: `Listened to 50% of a song`,
        transaction_type: 'bonus',
        metadata: {
          song_id: songId,
          song_slug: songSlug,
          day,
          source: 'daily_progress'
        }
      });

      // Mark as completed in our local cache
      completedRef.current.add(cacheKey);
      console.log(`🎵 Daily progress: Awarded 1 HeartCoin for completing ${songSlug}!`);
    } catch (err) {
      console.error('🎵 Daily progress: Failed to award HeartCoin:', err);
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

      // Get current user
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.user?.id) {
        console.log('🎵 Daily progress: No authenticated user');
        return;
      }
      const userId = session.user.id;

      // Get song UUID from slug
      const songId = await getSongId(trackSlug);
      if (!songId) return;

      currentSongIdRef.current = songId;
      const day = getTodayNY();
      const cacheKey = `${songId}:${day}`;

      // If already completed today, no need to track further
      const alreadyCompleted = await checkExistingProgress(userId, songId, day);
      if (alreadyCompleted) {
        console.log(`🎵 Daily progress: Already completed ${trackSlug} today`);
        return;
      }

      // Start tracking interval (1s)
      intervalId = window.setInterval(async () => {
        if (!mounted) return;
        if (!audioElement) return;

        // Source of truth: audio element state
        const { currentTime, duration, paused } = audioElement;

        // Wait for valid duration (handle Safari loadedmetadata timing)
        if (!duration || duration <= 0 || isNaN(duration)) {
          console.log('🎵 Daily progress: Waiting for valid duration...');
          return;
        }

        // Stop tracking if audio is paused
        if (paused) return;

        // Calculate completion percentage
        const completionPercent = (currentTime / duration) * 100;

        // Throttle upserts to every 5 seconds minimum
        const now = Date.now();
        if (now - lastUpsertRef.current < 5000) return;
        lastUpsertRef.current = now;

        // Check if we've hit the 50% threshold
        const shouldComplete = completionPercent >= 50 && !completedRef.current.has(cacheKey);

        // Upsert progress
        await upsertProgress(
          userId,
          songId,
          day,
          currentTime,
          duration,
          completionPercent,
          shouldComplete
        );

        // Award HeartCoin if completing for the first time
        if (shouldComplete) {
          await awardCompletionHeartCoin(userId, songId, trackSlug, day);

          // Clear interval since we're done tracking this song/day
          if (intervalId) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
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
    getSongId,
    checkExistingProgress,
    upsertProgress,
    awardCompletionHeartCoin
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
