"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

// Fixed total number of binder slots to display (9 pages x 6 slots = 54)
export const TOTAL_SLOTS = 54;

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
  /** Total cards owned by user (from user_cards table, regardless of slot assignment) */
  totalOwnedCards: number;
  /** Number of unlocked binder slots (from profile.card_slots) */
  unlockedSlotsCount: number;
  /** Number of cards currently placed in slots (filled slots) */
  cardsInSlots: number;
  /** Whether there is at least one empty slot available for purchase */
  hasEmptySlot: boolean;
  /** Index of the first empty slot, or -1 if none available */
  firstEmptySlotIndex: number;
  /** Display-adjusted unlocked slots (max of unlockedSlotsCount and cardsInSlots) */
  displayUnlockedSlots: number;
}

// Fetches authoritative binder slots from v_user_binder_slots view.
// Returns slots ordered by slot_index ASC, each with card data if present.
// Also fetches total owned cards count from user_cards table.
export function useBinderSlots(userId?: string | null): UseBinderSlotsResult {
  const [slots, setSlots] = useState<BinderSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalOwnedCards, setTotalOwnedCards] = useState(0);

  const fetchSlots = useCallback(async () => {
    if (!userId) {
      setSlots([]);
      setTotalOwnedCards(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch slots and total owned cards count in parallel
      const [slotsResult, cardsCountResult] = await Promise.all([
        supabaseBrowser
          .from('v_user_binder_slots')
          .select('*')
          .eq('user_id', userId)
          .order('slot_index', { ascending: true }),
        supabaseBrowser
          .from('user_cards')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
      ]);

      if (slotsResult.error) {
        console.error('[useBinderSlots] Error fetching slots:', slotsResult.error);
        setError('Failed to load binder slots');
        setSlots([]);
        return;
      }

      if (cardsCountResult.error) {
        console.error('[useBinderSlots] Error fetching cards count:', cardsCountResult.error);
        // Non-fatal: continue with slots, just log the error
      }

      setSlots((slotsResult.data || []) as BinderSlot[]);
      setTotalOwnedCards(cardsCountResult.count || 0);
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

  // Listen for relics refresh events (after relic award - may include slot unlocks)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => { fetchSlots(); };
    window.addEventListener('relics:refresh', handler);
    return () => window.removeEventListener('relics:refresh', handler);
  }, [fetchSlots]);

  // Compute derived values from slots
  const unlockedSlotsCount = useMemo(() =>
    slots.filter(s => s.is_unlocked).length,
    [slots]
  );

  const cardsInSlots = useMemo(() =>
    slots.filter(s => s.card_id !== null).length,
    [slots]
  );

  // All slots are now unlocked - return TOTAL_SLOTS
  const displayUnlockedSlots = useMemo(() => {
    return TOTAL_SLOTS;
  }, []);

  // Find first empty slot (unlocked but no card)
  const firstEmptySlotIndex = useMemo(() => {
    for (let i = 0; i < displayUnlockedSlots; i++) {
      const slot = slots.find(s => s.slot_index === i);
      if (!slot || !slot.card_id) {
        return i;
      }
    }
    return -1;
  }, [slots, displayUnlockedSlots]);

  // Whether there's at least one empty slot for purchase
  const hasEmptySlot = useMemo(() =>
    firstEmptySlotIndex >= 0,
    [firstEmptySlotIndex]
  );

  return useMemo(() => ({
    slots,
    loading,
    error,
    refresh: fetchSlots,
    totalOwnedCards,
    unlockedSlotsCount,
    cardsInSlots,
    hasEmptySlot,
    firstEmptySlotIndex,
    displayUnlockedSlots,
  }), [slots, loading, error, fetchSlots, totalOwnedCards, unlockedSlotsCount, cardsInSlots, hasEmptySlot, firstEmptySlotIndex, displayUnlockedSlots]);
}

