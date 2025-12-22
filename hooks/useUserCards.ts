"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

// Types for user owned cards
export type OwnedCardRow = {
  id: string;
  card_id: string;
  acquired_at: string;
  is_public?: boolean | null;
  acquisition_source?: string | null;
  cards: {
    id: string;
    card_name: string;
    element: string; // e.g., WATER, HEART, LIGHTNING, DARKNESS, or ALL
    rarity: string;
    is_released?: boolean;
    min_tier?: string;
    artwork_url?: string | null;
  };
};

export interface UseUserCardsResult {
  cards: OwnedCardRow[];
  loading: boolean;
  error: string | null;
  isOwner: boolean;
  refresh: () => Promise<void>;
}

// Shared hook to fetch a user's cards, joined with card metadata.
// - If viewer is the owner, return all cards
// - If viewer is not the owner or logged out, return only public cards
export function useUserCards(viewedUserId?: string): UseUserCardsResult {
  const [cards, setCards] = useState<OwnedCardRow[]>([]);
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
        setIsOwner(false);
        return;
      }

      const owner = !!viewerId && viewerId === targetUserId;
      setIsOwner(owner);

      // Base query: user_cards joined to cards, ordered by acquired_at
      let query = supabaseBrowser
        .from('user_cards')
        .select(`
          id,
          card_id,
          acquired_at,
          is_public,
          acquisition_source,
          cards (
            id,
            card_name,
            element,
            rarity,
            is_released,
            min_tier,
            artwork_url
          )
        `)
        .eq('user_id', targetUserId)
        .order('acquired_at', { ascending: true });

      // If not owner, only show public cards
      if (!owner) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useUserCards] Error fetching cards:', error);
        setError('Failed to load cards');
        setCards([]);
        return;
      }

      setCards((data || []) as OwnedCardRow[]);
    } catch (err) {
      console.error('[useUserCards] Unexpected error:', err);
      setError('Failed to load cards');
      setCards([]);
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
    loading,
    error,
    isOwner,
    refresh: fetchCards,
  }), [cards, loading, error, isOwner, fetchCards]);
}
