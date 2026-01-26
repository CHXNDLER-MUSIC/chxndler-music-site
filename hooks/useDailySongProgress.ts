/**
 * useDailySongProgress – simplified for new backend flow.
 *
 * Backend awards SOTD via RPC only when song is complete (~100%).
 * Frontend should ONLY increment play_count when the track fully ends (loop).
 * This hook is kept for API compatibility and exports a helper to call on 'ended'.
 */
import { useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { getNYDateString } from '@/lib/time';

export interface UseDailySongProgressOptions {
  audioElement: HTMLAudioElement | null;
  trackSlug: string | null;
  isPlaying: boolean;
  enabled?: boolean;
  songOfDaySlug?: string | null;
  songOfDayId?: string | null;
}

// No-op hook for compatibility (progress is handled elsewhere)
export function useDailySongProgress(_opts: UseDailySongProgressOptions) {
  useEffect(() => {}, []);
}

// Call this ONLY on the <audio> 'ended' event and ONLY when user is logged in.
// Replaces prior record_song_play usage; increments play_count for today (NY) in DB.
export async function recordSongEndedPlay(songId: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      console.log('[DailyProgress] skipped: no session');
      return false;
    }

    const { error } = await supabaseBrowser.rpc('increment_daily_song_play', { p_song_id: songId });
    if (error) {
      console.error('[DailySongProgress] increment_daily_song_play RPC error:', {
        error,
        errorMessage: (error as any)?.message,
        errorCode: (error as any)?.code,
        errorDetails: (error as any)?.details,
        errorHint: (error as any)?.hint,
        payload: { p_song_id: songId },
        hasSession: true,
        userId,
      });
      return false;
    }

    // After increment, refresh progress row and SOTD claim for today (NY)
    // Use retry logic because the backend trigger may be async
    const nyDay = getNYDateString();
    try {
      await supabaseBrowser
        .from('user_song_daily_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('song_id', songId)
        .eq('day', nyDay)
        .limit(1);
    } catch {}

    // Check for claim with retry logic (backend trigger may need time to complete)
    let claimFound = false;
    const maxRetries = 4;
    const delays = [300, 600, 1000, 1500];

    for (let i = 0; i < maxRetries && !claimFound; i++) {
      // Wait before checking (gives backend trigger time to complete)
      await new Promise(resolve => setTimeout(resolve, delays[i]));

      try {
        const { count } = await supabaseBrowser
          .from('user_song_of_day_claims')
          .select('*', { head: true, count: 'exact' })
          .eq('user_id', userId)
          .eq('day', nyDay);

        if ((count ?? 0) > 0) {
          claimFound = true;
          console.log(`[DailySongProgress] Claim found after ${i + 1} attempt(s)`);
        }
      } catch {}
    }

    // Notify UI to refresh
    window.dispatchEvent(new CustomEvent('songOfDay:refresh'));
    if (claimFound) {
      console.log('[DailySongProgress] Dispatching dailySongQuestCompleted event');
      window.dispatchEvent(new CustomEvent('dailySongQuestCompleted', { detail: { day: nyDay } }));
    }

    return true;
  } catch (err) {
    console.error('[DailySongProgress] recordSongEndedPlay exception:', {
      error: err,
      errorMessage: (err as any)?.message,
      errorCode: (err as any)?.code,
      errorDetails: (err as any)?.details,
      errorHint: (err as any)?.hint,
      errorStack: (err as any)?.stack,
      payload: { songId },
    });
    return false;
  }
}

export default useDailySongProgress;
