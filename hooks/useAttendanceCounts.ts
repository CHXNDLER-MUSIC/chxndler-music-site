"use client";

import { useState, useEffect, useMemo } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { supabaseBrowser } from '@/lib/supabase-browser';

export type AttendanceMode = 'LIVE_STREAM' | 'IN_PERSON';

export interface AttendanceCounts {
  liveStreamCount: number;
  inPersonCount: number;
  totalAttendanceCount: number;
  loading: boolean;
  error: string | null;
}

interface RedemptionWithPhrase {
  id: string;
  secret_phrase_id: string;
  redeemed_at: string;
  secret_phrases: {
    attendance_mode: AttendanceMode | null;
  } | null;
}

/**
 * Hook to fetch and compute attendance counts from secret phrase redemptions.
 * Joins secret_phrase_redemptions with secret_phrases to get attendance_mode.
 * Falls back to LIVE_STREAM if attendance_mode is missing.
 */
export function useAttendanceCounts(): AttendanceCounts {
  const { user } = useProfile();
  const [redemptions, setRedemptions] = useState<RedemptionWithPhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRedemptions = async () => {
      if (!user?.id) {
        setRedemptions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query secret_phrase_redemptions joined with secret_phrases
        // to get attendance_mode for each redemption
        const { data, error: fetchError } = await supabaseBrowser
          .from('secret_phrase_redemptions')
          .select(`
            id,
            secret_phrase_id,
            redeemed_at,
            secret_phrases (
              attendance_mode
            )
          `)
          .eq('user_id', user.id);

        if (fetchError) {
          console.error('Error fetching attendance redemptions:', fetchError);
          setError(`Failed to fetch attendance data: ${fetchError.message}`);
          setRedemptions([]);
          return;
        }

        setRedemptions((data || []) as RedemptionWithPhrase[]);
      } catch (err) {
        console.error('Error in fetchRedemptions:', err);
        setError(`Attendance fetch error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setRedemptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRedemptions();
  }, [user?.id]);

  // Compute counts with useMemo to avoid recalculation on every render
  const counts = useMemo(() => {
    let liveStreamCount = 0;
    let inPersonCount = 0;

    for (const redemption of redemptions) {
      // Get attendance_mode from joined secret_phrases
      // Fallback to LIVE_STREAM if missing (safe default per requirements)
      const mode = redemption.secret_phrases?.attendance_mode ?? 'LIVE_STREAM';

      if (mode === 'LIVE_STREAM') {
        liveStreamCount++;
      } else if (mode === 'IN_PERSON') {
        inPersonCount++;
      } else {
        // Unknown mode - treat as LIVE_STREAM (safe fallback)
        liveStreamCount++;
      }
    }

    return {
      liveStreamCount,
      inPersonCount,
      totalAttendanceCount: liveStreamCount + inPersonCount,
    };
  }, [redemptions]);

  return {
    ...counts,
    loading,
    error,
  };
}
