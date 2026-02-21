import { useEffect, useState, useCallback } from 'react';
import { supabaseClient } from './supabaseClient';
import { RELIC_ICONS, RelicAsset } from '@/config/assets';

export interface UserRelic {
  id: string;
  code: string;
  label: string;
  kind: string | null;
  rarity: string | null;
  image_url: string | null;
  description: string | null;
  obtained_at: string | null;
  isUnlocked: boolean;
}

export interface RelicWithStatus extends UserRelic {
  isUnlocked: boolean;
  isLocked: boolean;
}

export function useUserRelics(userId?: string) {
  const [relics, setRelics] = useState<RelicWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchCounter, setRefetchCounter] = useState(0);

  // Refetch function to trigger a data refresh
  const refetch = useCallback(() => {
    setRefetchCounter(c => c + 1);
  }, []);

  // Listen for relics:refresh event to trigger refetch
  useEffect(() => {
    const handleRelicsRefresh = () => {
      if (process.env.NODE_ENV !== "production") console.log('[useUserRelics] Received relics:refresh event, refetching...');
      refetch();
    };
    window.addEventListener('relics:refresh', handleRelicsRefresh);
    return () => window.removeEventListener('relics:refresh', handleRelicsRefresh);
  }, [refetch]);

  useEffect(() => {
    if (!userId) {
      if (process.env.NODE_ENV !== "production") console.log('[useUserRelics] No userId provided, skipping fetch');
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchUserRelics() {
      try {
        setLoading(true);
        setError(null);
        if (process.env.NODE_ENV !== "production") console.log('[useUserRelics] Fetching relics for user:', userId);

        // First, get all available relics (only kind='RELIC', not boosts/slots)
        const { data: allRelics, error: relicsError } = await supabaseClient
          .from('relics')
          .select('id, code, label, kind, rarity, image_url, description, created_at')
          .eq('kind', 'RELIC')
          .order('created_at', { ascending: true });

        if (relicsError) {
          console.error('[useUserRelics] Error fetching relics definitions:', relicsError);
          throw relicsError;
        }
        if (process.env.NODE_ENV !== "production") console.log('[useUserRelics] Fetched', allRelics?.length || 0, 'relic definitions');

        // Then get user's unlocked relics from user_relics
        const { data: userRelicsData, error: userRelicsError } = await supabaseClient
          .from('user_relics')
          .select('relic_id, obtained_at')
          .eq('user_id', userId);

        if (userRelicsError) {
          // Log detailed error info for RLS debugging
          console.error('[useUserRelics] Error fetching user_relics:', {
            message: userRelicsError.message,
            code: userRelicsError.code,
            details: userRelicsError.details,
            hint: userRelicsError.hint,
          });

          // Check for RLS/permission denied errors
          if (
            userRelicsError.message?.toLowerCase().includes('permission') ||
            userRelicsError.message?.toLowerCase().includes('rls') ||
            userRelicsError.code === '42501' ||
            userRelicsError.code === 'PGRST301'
          ) {
            console.error('[useUserRelics] RLS/Permission error on user_relics table - SELECT is blocked. All relics will show as locked. Check your Supabase RLS policies for user_relics.');
          }

          // Continue with empty user relics instead of throwing
          if (process.env.NODE_ENV !== "production") console.warn('[useUserRelics] Continuing with empty user_relics due to error');
        }

        if (!mounted) return;

        // Create a Set of owned relic_ids for quick lookup
        const ownedRelicIds = new Set<string>(
          (userRelicsData || []).map(ur => ur.relic_id)
        );
        if (process.env.NODE_ENV !== "production") console.log('[useUserRelics] User owns', ownedRelicIds.size, 'relics:', Array.from(ownedRelicIds));

        // Build a map of relic_id -> obtained_at for display
        const obtainedAtMap = new Map<string, string>();
        (userRelicsData || []).forEach(ur => {
          if (ur.relic_id && ur.obtained_at) {
            obtainedAtMap.set(ur.relic_id, ur.obtained_at);
          }
        });

        // Combine all relics with unlock status
        const relicsWithStatus: RelicWithStatus[] = (allRelics || []).map(relic => {
          const isUnlocked = ownedRelicIds.has(relic.id);

          return {
            id: relic.id,
            code: relic.code,
            label: relic.label,
            kind: relic.kind,
            rarity: relic.rarity,
            image_url: relic.image_url,
            description: relic.description,
            obtained_at: obtainedAtMap.get(relic.id) || null,
            isUnlocked,
            isLocked: !isUnlocked
          };
        });

        if (process.env.NODE_ENV !== "production") {
          console.log('[useUserRelics] Built relicsWithStatus:', {
            total: relicsWithStatus.length,
            unlocked: relicsWithStatus.filter(r => r.isUnlocked).length,
            locked: relicsWithStatus.filter(r => r.isLocked).length,
          });
        }

        setRelics(relicsWithStatus);
      } catch (err) {
        if (!mounted) return;
        console.error('[useUserRelics] Unexpected error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load relics');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchUserRelics();

    return () => {
      mounted = false;
    };
  }, [userId, refetchCounter]);

  const unlockedRelics = relics.filter(r => r.isUnlocked);
  const lockedRelics = relics.filter(r => r.isLocked);

  return {
    relics,
    unlockedRelics,
    lockedRelics,
    loading,
    error,
    unlockedCount: unlockedRelics.length,
    totalCount: relics.length,
    refetch
  };
}