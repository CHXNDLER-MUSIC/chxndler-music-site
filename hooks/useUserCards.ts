"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

// Types for user owned cards (joined from user_cards + cards table)
export type OwnedCardRow = {
  id: string;
  user_id: string;
  card_id: string;
  slot_index: number | null;
  acquired_at: string;
  acquisition_source?: string | null;
  is_public?: boolean | null;
  is_digital?: boolean | null;
  cards: {
    id: string;
    card_name: string;
    element: string; // e.g., WATER, HEART, LIGHTNING, DARKNESS, or ALL
    rarity: string;
    artwork_url?: string | null;
    description?: string | null;
    is_released?: boolean;
    min_tier?: string;
    is_starter?: boolean;
    price_heartcoins?: number | null;
    physical_price_heartcoins?: number | null;
    is_physical_available?: boolean;
    cost_physical_heartcoins?: number | null;
  };
};

// Flattened card row for easy UI consumption
export type FlattenedCardRow = {
  user_card_id: string;
  card_id: string;
  slot_index: number | null;
  acquired_at: string;
  is_public: boolean;
  is_digital: boolean;
  card_name: string;
  artwork_url: string | null;
  element: string | null;
  rarity: string | null;
  description: string;
  is_released: boolean;
  min_tier: string;
};

export interface UseUserCardsResult {
  cards: OwnedCardRow[];
  flattenedCards: FlattenedCardRow[];
  loading: boolean;
  error: string | null;
  isOwner: boolean;
  refresh: () => Promise<void>;
}

// Helper to flatten OwnedCardRow with defensive null handling
function flattenCardRows(data: unknown[]): { cards: OwnedCardRow[], flattened: FlattenedCardRow[] } {
  const validCards: OwnedCardRow[] = [];
  const flattened: FlattenedCardRow[] = [];

  for (const uc of data as OwnedCardRow[]) {
    const c = uc.cards;
    if (!c) {
      if (process.env.NODE_ENV !== "production") console.warn("[Binder] user_cards row missing cards join", uc);
      continue; // Skip rows where cards join failed
    }

    // Add to valid cards array
    validCards.push(uc);

    // Create flattened version for UI
    flattened.push({
      user_card_id: uc.id,
      card_id: uc.card_id,
      slot_index: uc.slot_index ?? null,
      acquired_at: uc.acquired_at,
      is_public: uc.is_public ?? false,
      is_digital: uc.is_digital ?? true,
      card_name: c.card_name ?? "Unknown Card",
      artwork_url: c.artwork_url ?? null,
      element: c.element ?? null,
      rarity: c.rarity ?? null,
      description: c.description ?? "",
      is_released: c.is_released ?? false,
      min_tier: c.min_tier ?? "wanderer",
    });
  }

  return { cards: validCards, flattened };
}

// Shared hook to fetch a user's cards, joined with card metadata.
// - If viewer is the owner, return all cards
// - If viewer is not the owner or logged out, return only public cards
export function useUserCards(viewedUserId?: string): UseUserCardsResult {
  const [cards, setCards] = useState<OwnedCardRow[]>([]);
  const [flattenedCards, setFlattenedCards] = useState<FlattenedCardRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine viewer and ownership
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const viewerId = session?.user?.id || null;

      // Default to current viewer if no viewedUserId provided
      const targetUserId = viewedUserId || viewerId || null;

      if (!targetUserId) {
        // No user to fetch for
        setCards([]);
        setFlattenedCards([]);
        setIsOwner(false);
        return;
      }

      const owner = !!viewerId && viewerId === targetUserId;
      setIsOwner(owner);

      // Build base query: user_cards joined to cards with all needed fields
      // Ordered by slot_index ASC NULLS LAST, then acquired_at ASC
      let query = supabaseBrowser
        .from('user_cards')
        .select(`
          id,
          user_id,
          card_id,
          slot_index,
          acquired_at,
          acquisition_source,
          is_public,
          is_digital,
          cards:card_id (
            id,
            card_name,
            element,
            rarity,
            artwork_url,
            description,
            is_released,
            min_tier,
            is_starter,
            price_heartcoins,
            physical_price_heartcoins,
            is_physical_available,
            cost_physical_heartcoins
          )
        `)
        .eq('user_id', targetUserId)
        .order('slot_index', { ascending: true, nullsFirst: false })
        .order('acquired_at', { ascending: true });

      // If not owner, only show public cards
      if (!owner) {
        query = query.eq('is_public', true);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('[useUserCards] Error fetching cards:', queryError);
        setError('Failed to load cards');
        setCards([]);
        setFlattenedCards([]);
        return;
      }

      // Process and flatten data with defensive null handling
      const { cards: validCards, flattened } = flattenCardRows(data || []);
      setCards(validCards);
      setFlattenedCards(flattened);
    } catch (err) {
      console.error('[useUserCards] Unexpected error:', err);
      setError('Failed to load cards');
      setCards([]);
      setFlattenedCards([]);
    } finally {
      setLoading(false);
    }
  }, [viewedUserId]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Listen for global refresh events so all containers update after purchases
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => { fetchCards(); };
    const binderHandler = () => { fetchCards(); };
    window.addEventListener('userCards:refresh', handler as EventListener);
    window.addEventListener('binder:refresh', binderHandler as EventListener);
    return () => {
      window.removeEventListener('userCards:refresh', handler as EventListener);
      window.removeEventListener('binder:refresh', binderHandler as EventListener);
    };
  }, [fetchCards]);

  return useMemo(() => ({
    cards,
    flattenedCards,
    loading,
    error,
    isOwner,
    refresh: fetchCards,
  }), [cards, flattenedCards, loading, error, isOwner, fetchCards]);
}
