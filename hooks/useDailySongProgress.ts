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
 * Also completes the LISTEN_SONG_OF_DAY bonus quest when Song of Day is completed.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { logHeartcoinTransaction } from '@/utils/heartcoins';
import { consumeActiveBoost } from '@/lib/boosts';

// Cache for LISTEN_SONG_OF_DAY quest ID (looked up once per session)
let listenSongQuestIdCache: string | null = null;

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
  playNumber: number;          // Sequential play count for repeats
}

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
  const lastUpsertRef = useRef<number>(0);
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
        console.error(`🎵 Daily progress: Error fetching song for slug "${slug}":`, error.message);
        return null;
      }

      if (!data) {
        console.warn(`🎵 Daily progress: Song not found for slug "${slug}"`);
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

  // Get the next play_number for a new play session
  const getNextPlayNumber = useCallback(async (
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
        console.warn('🎵 Daily progress: Error fetching play_number:', error.message);
        return 1;
      }

      if (!data) {
        // No existing records, start at 1
        return 1;
      }

      // Return next play number
      return (data.play_number || 0) + 1;
    } catch (err) {
      // Error - start at 1
      console.warn('🎵 Daily progress: Exception fetching play_number:', err);
      return 1;
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
        console.warn('🎵 Daily progress: Error checking existing progress:', error.message);
        return false;
      }

      // Row may not exist yet - that's okay
      if (data?.completed) {
        completedRef.current.add(cacheKey);
        return true;
      }
      return false;
    } catch (err) {
      // No existing record or error - not completed
      console.warn('🎵 Daily progress: Exception checking existing progress:', err);
      return false;
    }
  }, []);

  // Upsert progress to database (now includes play_number)
  const upsertProgress = useCallback(async (
    userId: string,
    songId: string,
    day: string,
    playNumber: number,
    listenedSeconds: number,
    durationSeconds: number,
    completionPercent: number,
    markCompleted: boolean,
    isNewSession: boolean = false
  ) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // Validate inputs - skip if any values are invalid
      if (!isFinite(listenedSeconds) || !isFinite(durationSeconds) || !isFinite(completionPercent)) {
        console.log('🎵 Daily progress: Skipping upsert - invalid values detected', {
          listenedSeconds,
          durationSeconds,
          completionPercent
        });
        isProcessingRef.current = false;
        return;
      }

      // Ensure duration_seconds and listened_seconds are integers
      const safeDurationSeconds = Math.floor(durationSeconds);
      const safeListenedSeconds = Math.floor(listenedSeconds);

      // Fix numeric overflow: completion_percent must be 0-100, rounded to 2 decimals, never NaN/Infinity
      const rawPercent = (safeListenedSeconds / safeDurationSeconds) * 100;
      const safePercent = Math.min(
        100,
        Math.max(
          0,
          Number(rawPercent.toFixed(2))
        )
      );

      // Final validation: skip if safePercent is still NaN or Infinity
      if (!isFinite(safePercent)) {
        console.log('🎵 Daily progress: Skipping upsert - safePercent is invalid', {
          rawPercent,
          safePercent,
          safeListenedSeconds,
          safeDurationSeconds
        });
        isProcessingRef.current = false;
        return;
      }

      const progressData: any = {
        user_id: userId,
        song_id: songId,
        day,
        play_number: playNumber,
        listened_seconds: safeListenedSeconds,
        duration_seconds: safeDurationSeconds,
        completion_percent: safePercent,
        updated_at: new Date().toISOString()
      };

      // Set started_at only for new sessions
      if (isNewSession) {
        progressData.started_at = new Date().toISOString();
      }

      // Only set completed fields if we're marking as completed
      if (markCompleted) {
        progressData.completed = true;
        progressData.completed_at = new Date().toISOString();
      }

      const { error } = await supabaseBrowser
        .from('user_song_daily_progress')
        .upsert(progressData, {
          onConflict: 'user_id,song_id,day,play_number',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('🎵 Daily progress: Upsert failed:', error.message);
      }
    } catch (err) {
      console.error('🎵 Daily progress: Error upserting:', err);
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  // Award HeartCoin for song completion (legacy - kept for non-Song-of-Day songs)
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
      // Attempt to consume an active listening boost
      const boostConsumed = await consumeActiveBoost(userId, 'boost_listening');

      // Calculate final reward amount (2x if boost was consumed)
      const baseAmount = 1;
      const multiplier = boostConsumed ? 2 : 1;
      const finalAmount = baseAmount * multiplier;

      const description = boostConsumed
        ? `Listened to 50% of a song (Listening Boost 2x)`
        : `Listened to 50% of a song`;

      await logHeartcoinTransaction(supabaseBrowser, {
        user_id: userId,
        amount: finalAmount,
        reason: 'SONG_LISTEN_COMPLETE',
        description,
        transaction_type: 'bonus',
        metadata: {
          song_id: songId,
          song_slug: songSlug,
          day,
          source: 'daily_progress',
          boost_applied: boostConsumed,
          boost_key: boostConsumed ? 'boost_listening' : null,
          multiplier
        }
      });

      // Mark as completed in our local cache
      completedRef.current.add(cacheKey);

      if (boostConsumed) {
        console.log(`🎵 Daily progress: Awarded ${finalAmount} HeartCoins for completing ${songSlug} (Listening Boost 2x)!`);
      } else {
        console.log(`🎵 Daily progress: Awarded ${finalAmount} HeartCoin for completing ${songSlug}!`);
      }
    } catch (err) {
      console.error('🎵 Daily progress: Failed to award HeartCoin:', err);
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
      console.log('🎵 Daily progress: Song of Day RPC already fired for today, skipping');
      return false;
    }

    // Mark as fired BEFORE the RPC call to prevent race conditions
    sotdCompletionFiredRef.current[guardKey] = true;

    try {
      console.log('🎵 Daily progress: Calling complete_song_of_day_once_per_day RPC with song_id:', songId);

      const { data, error } = await supabaseBrowser.rpc('complete_song_of_day_once_per_day', {
        p_song_id: songId
      });

      if (error) {
        console.error('🎵 Daily progress: Song of Day RPC error:', {
          message: error?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code,
        });
        // Don't reset the guard - RPC may have partially succeeded
        return false;
      }

      console.log('🎵 Daily progress: Song of Day RPC result:', data);

      // Handle response
      if (data?.ok === true) {
        console.log('🎵 Daily progress: Song of Day completed successfully!');

        // Only trigger celebration if HeartCoin was actually awarded
        if (data?.heartcoin_awarded === true) {
          // Import and trigger HeartCoin celebration
          const { triggerHeartCoinCelebration } = await import('@/utils/heartcoinCelebration');
          triggerHeartCoinCelebration(1);
          console.log('🎵 Daily progress: HeartCoin celebration triggered');
        }

        // Dispatch event to refresh UI state (Daily Quests + profile)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dailySongQuestCompleted', {
            detail: { day, awarded: data?.heartcoin_awarded, status: 'completed' }
          }));
          window.dispatchEvent(new CustomEvent('profile:force-refresh'));
          window.dispatchEvent(new CustomEvent('relics:refresh'));
        }

        // Update local state refs
        prevCompletedStateRef.current[day] = true;
        completedDailySongQuestRef.current[day] = true;

        return true;
      } else if (data?.ok === false && data?.reason === 'not_song_of_day') {
        // Not the song of the day - do nothing (don't error)
        console.log('🎵 Daily progress: Song is not the Song of the Day, skipping');
        return false;
      } else if (data?.ok === false && data?.reason === 'already_completed') {
        // Already completed today - update local state
        console.log('🎵 Daily progress: Song of Day already completed today');
        prevCompletedStateRef.current[day] = true;
        completedDailySongQuestRef.current[day] = true;
        return false;
      } else {
        console.warn('🎵 Daily progress: Unexpected Song of Day RPC response:', data);
        return false;
      }
    } catch (err) {
      console.error('🎵 Daily progress: Song of Day RPC exception:', err);
      return false;
    }
  }, []);

  // Complete the LISTEN_SONG_OF_DAY bonus quest via RPC
  // Only triggers when progress transitions from completed=false -> completed=true
  const completeDailySongQuest = useCallback(async (day: string) => {
    // Guard: Only trigger once per day
    if (completedDailySongQuestRef.current[day]) {
      console.log('🎵 Daily progress: Quest already triggered for today, skipping');
      return;
    }

    // Guard: Only trigger on false->true transition
    const wasCompletedBefore = prevCompletedStateRef.current[day] === true;
    if (wasCompletedBefore) {
      console.log('🎵 Daily progress: No false->true transition, skipping quest completion');
      return;
    }

    // Mark as triggered BEFORE the RPC call to prevent race conditions
    completedDailySongQuestRef.current[day] = true;

    try {
      // Get or lookup the LISTEN_SONG_OF_DAY quest ID
      if (!listenSongQuestIdCache) {
        const { data: questData, error: questError } = await supabaseBrowser
          .from('bonus_quests')
          .select('id')
          .eq('quest_key', 'LISTEN_SONG_OF_DAY')
          .eq('is_active', true)
          .maybeSingle();

        if (questError) {
          console.warn('🎵 Daily progress: Error fetching quest:', questError.message);
          return;
        }

        if (!questData?.id) {
          console.log('🎵 Daily progress: LISTEN_SONG_OF_DAY quest not found or inactive');
          return;
        }
        listenSongQuestIdCache = questData.id;
      }

      // Call the idempotent RPC
      const { data, error } = await supabaseBrowser.rpc('complete_bonus_quest_once_per_day', {
        p_quest_id: listenSongQuestIdCache
      });

      // Handle success cases
      if (!error && data) {
        const status = data.status;
        const awarded = data.awarded === true;

        if (status === 'completed' || status === 'already_completed') {
          // Update previous completed state
          prevCompletedStateRef.current[day] = true;

          if (status === 'completed' && awarded) {
            console.log('🎵 Daily progress: LISTEN_SONG_OF_DAY quest completed successfully!');
          } else {
            console.log('🎵 Daily progress: LISTEN_SONG_OF_DAY quest already completed today');
          }

          // Dispatch event to refresh UI state (bonus quests + profile)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dailySongQuestCompleted', {
              detail: { day, awarded, status }
            }));
          }
          return;
        }
      }

      // Handle duplicate key errors gracefully (NOT an error)
      if (error) {
        const errMsg = error.message?.toLowerCase() || '';
        const errCode = error.code || '';

        // Duplicate key / already completed - treat as success
        if (errCode === '23505' || errMsg.includes('duplicate key') || errMsg.includes('unique constraint')) {
          console.log('🎵 Daily progress: Quest already completed (duplicate key), treating as success');
          prevCompletedStateRef.current[day] = true;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dailySongQuestCompleted', {
              detail: { day, awarded: false, status: 'already_completed' }
            }));
          }
          return;
        }

        // Other errors - log but don't spam
        console.log('🎵 Daily progress: Quest RPC returned error (may be OK):', errCode, errMsg.slice(0, 80));
      }
    } catch (err: any) {
      // Catch duplicate key in exception form
      const errStr = String(err?.message || err || '').toLowerCase();
      if (errStr.includes('duplicate key') || errStr.includes('23505') || errStr.includes('unique constraint')) {
        console.log('🎵 Daily progress: Quest already completed (caught exception), treating as success');
        prevCompletedStateRef.current[day] = true;
        return;
      }
      console.log('🎵 Daily progress: Quest completion exception (may be OK):', errStr.slice(0, 80));
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
      if (!session?.user?.id) return;
      const userId = session.user.id;

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
        const nextPlayNumber = await getNextPlayNumber(userId, songId, day);
        currentPlayNumberRef.current = nextPlayNumber;
        playSessionKeyRef.current = newSessionKey;
        prevCurrentTimeRef.current = 0;
        initialRowCreatedRef.current = false;
        console.log(`🎵 Daily progress: Starting play #${nextPlayNumber} for ${trackSlug}`);
      }

      const playNumber = currentPlayNumberRef.current;
      const cacheKey = `${songId}:${day}:${playNumber}`;

      // If already completed this specific play session, no need to track further
      const alreadyCompleted = await checkExistingProgress(userId, songId, day, playNumber);
      if (alreadyCompleted) {
        // Mark as already completed in our state refs (prevents false->true transition)
        prevCompletedStateRef.current[day] = true;
        completedDailySongQuestRef.current[day] = true;
        console.log(`🎵 Daily progress: Play #${playNumber} of ${trackSlug} already completed today`);
        return;
      }

      // Mark today's initial state as "not completed" so we can detect false->true transition
      if (prevCompletedStateRef.current[day] === undefined) {
        prevCompletedStateRef.current[day] = false;
      }

      // IMMEDIATE initial upsert: Create the row right away when playback starts
      // This ensures the row exists in user_song_daily_progress immediately on LISTEN click
      const { currentTime: initialTime, duration: initialDuration } = audioElement;
      if (!initialRowCreatedRef.current && initialDuration && initialDuration > 0 && isFinite(initialDuration)) {
        const initialPercent = (initialTime / initialDuration) * 100;
        await upsertProgress(userId, songId, day, playNumber, initialTime, initialDuration, initialPercent, false, true);
        lastUpsertRef.current = Date.now();
        initialRowCreatedRef.current = true;
        prevCurrentTimeRef.current = initialTime;
      }

      // Start tracking interval (1s)
      intervalId = window.setInterval(async () => {
        if (!mounted) return;
        if (!audioElement) return;

        // Source of truth: audio element state
        const { currentTime, duration, paused } = audioElement;

        // Wait for valid duration (handle Safari loadedmetadata timing)
        // Also check for Infinity which can occur with streaming audio
        if (!duration || duration <= 0 || isNaN(duration) || !isFinite(duration)) {
          return;
        }

        // Stop tracking if audio is paused
        if (paused) return;

        // DETECT SONG RESTART: currentTime goes from >5s back to <2s (song looped or replayed)
        const prevTime = prevCurrentTimeRef.current;
        const isRestart = prevTime > 5 && currentTime < 2;

        if (isRestart) {
          // Song restarted! Increment play_number and create new row
          const newPlayNumber = await getNextPlayNumber(userId, songId, day);
          currentPlayNumberRef.current = newPlayNumber;
          initialRowCreatedRef.current = false;
          prevCurrentTimeRef.current = currentTime;

          console.log(`🎵 Daily progress: Song restarted! Starting play #${newPlayNumber} for ${trackSlug}`);

          // Create the new row immediately
          const initialPercent = (currentTime / duration) * 100;
          await upsertProgress(userId, songId, day, newPlayNumber, currentTime, duration, initialPercent, false, true);
          lastUpsertRef.current = Date.now();
          initialRowCreatedRef.current = true;
          return;
        }

        // Update previous time for next iteration
        prevCurrentTimeRef.current = currentTime;

        const currentPlayNum = currentPlayNumberRef.current;
        const currentCacheKey = `${songId}:${day}:${currentPlayNum}`;

        // Calculate completion percentage
        const completionPercent = (currentTime / duration) * 100;

        // Throttle upserts to every 5 seconds minimum
        // EXCEPTION: Allow immediate upsert if initial row hasn't been created yet
        const now = Date.now();
        const isInitialRow = !initialRowCreatedRef.current;
        if (!isInitialRow && now - lastUpsertRef.current < 5000) return;
        lastUpsertRef.current = now;

        // Mark initial row as created
        if (isInitialRow) {
          initialRowCreatedRef.current = true;
        }

        // Check if we've hit the 50% threshold for this play session
        const shouldComplete = completionPercent >= 50 && !completedRef.current.has(currentCacheKey);

        // Upsert progress
        await upsertProgress(
          userId,
          songId,
          day,
          currentPlayNum,
          currentTime,
          duration,
          completionPercent,
          shouldComplete,
          isInitialRow
        );

        // Award HeartCoin if completing for the first time AND it's the Song of the Day
        if (shouldComplete) {
          // Mark this play session as completed
          completedRef.current.add(currentCacheKey);

          // Check if this is the Song of the Day using the canonical song_id
          // Compare by song_id (UUID) which is more reliable than slug
          const isSongOfDayById = songOfDayId && songId === songOfDayId;
          // Fallback to slug comparison if songOfDayId is not available
          const isSongOfDayBySlug = !songOfDayId && songOfDaySlug && trackSlug === songOfDaySlug;
          const isSongOfDay = isSongOfDayById || isSongOfDayBySlug;

          if (isSongOfDay) {
            console.log(`🎵 Daily progress: Song of the Day play #${currentPlayNum} completed for ${trackSlug}`);

            // Use the new RPC to complete Song of the Day (handles HeartCoin + quest in one call)
            // This is idempotent and will only award once per day
            await completeSongOfDayIfEligible(songId, day);
          } else {
            console.log(`🎵 Daily progress: Play #${currentPlayNum} completed but not Song of the Day (songId: ${songId} !== songOfDayId: ${songOfDayId}), no HeartCoin awarded`);
          }

          // NOTE: We no longer clear the interval since we want to track repeats!
          // The interval continues to run to detect when the song restarts
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
    getNextPlayNumber,
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
