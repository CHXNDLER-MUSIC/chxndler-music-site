"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

// Slot from v_user_binder_slots view
export type BinderSlot = {
  user_id: string;
  slot_index: number;
  is_unlocked: boolean;
  card_id: string | null;
  card_name: string | null;
  artwork_url: string | null;
  element: string | null;
  rarity: string | null;
  is_starter: boolean | null;
};

export interface UseBinderSlotsResult {
  slots: BinderSlot[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Fetches authoritative binder slots from v_user_binder_slots view.
// Returns slots ordered by slot_index ASC, each with card data if present.
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

      const { data, error: queryError } = await supabaseBrowser
        .from('v_user_binder_slots')
        .select('*')
        .eq('user_id', userId)
        .order('slot_index', { ascending: true });

      if (queryError) {
        console.error('[useBinderSlots] Error fetching slots:', queryError);
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

  // Listen for binder refresh events (after purchase)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => { fetchSlots(); };
    window.addEventListener('binder:refresh', handler);
    return () => window.removeEventListener('binder:refresh', handler);
  }, [fetchSlots]);

  return useMemo(() => ({
    slots,
    loading,
    error,
    refresh: fetchSlots,
  }), [slots, loading, error, fetchSlots]);
}

