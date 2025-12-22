"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export type BinderSlot = {
  user_id: string;
  slot_number: number;
  card_id: string | null;
  cards: {
    id: string;
    card_name: string;
    artwork_url?: string | null;
    element: string;
    rarity: string;
  } | null;
};

export interface UseBinderSlotsResult {
  slots: BinderSlot[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Fetches authoritative binder slots for a user, ordered by slot_number ASC.
// Returns up to 50 slots (or however many exist), each optionally joined with cards.
export function useBinderSlots(userId?: string | null): UseBinderSlotsResult {
  const [slots, setSlots] = useState<BinderSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    if (!userId) {
      setSlots([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabaseBrowser
        .from('binder_slots')
        .select(`
          user_id,
          slot_number,
          card_id,
          cards (
            id,
            card_name,
            artwork_url,
            element,
            rarity
          )
        `)
        .eq('user_id', userId)
        .order('slot_number', { ascending: true });

      if (error) {
        console.error('[useBinderSlots] Error fetching slots:', error);
        setError('Failed to load binder slots');
        setSlots([]);
        return;
      }

      setSlots((data || []) as BinderSlot[]);
    } catch (e) {
      console.error('[useBinderSlots] Unexpected error:', e);
      setError('Failed to load binder slots');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return useMemo(() => ({
    slots,
    loading,
    error,
    refresh: fetchSlots,
  }), [slots, loading, error, fetchSlots]);
}

