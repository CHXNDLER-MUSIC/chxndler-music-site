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
      console.log('[useUserRelics] Received relics:refresh event, refetching...');
      refetch();
    };
    window.addEventListener('relics:refresh', handleRelicsRefresh);
    return () => window.removeEventListener('relics:refresh', handleRelicsRefresh);
  }, [refetch]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchUserRelics() {
      try {
        setLoading(true);
        setError(null);

        // First, get all available relics
        const { data: allRelics, error: relicsError } = await supabaseClient
          .from('relics')
          .select('*');

        if (relicsError) {
          throw relicsError;
        }

        // Then get user's unlocked relics
        const { data: userRelics, error: userRelicsError } = await supabaseClient
          .from('user_relics')
          .select(`
            relic_id,
            obtained_at,
            relics!inner (
              id,
              code,
              label,
              kind,
              rarity,
              image_url,
              description
            )
          `)
          .eq('user_id', userId);

        if (userRelicsError) {
          throw userRelicsError;
        }

        if (!mounted) return;

        // Create a map of unlocked relic IDs for quick lookup
        const unlockedRelicIds = new Set(userRelics?.map(ur => ur.relic_id) || []);

        // Combine all relics with unlock status
        const relicsWithStatus: RelicWithStatus[] = (allRelics || []).map(relic => {
          const userRelic = userRelics?.find(ur => ur.relic_id === relic.id);
          const isUnlocked = unlockedRelicIds.has(relic.id);
          
          return {
            id: relic.id,
            code: relic.code,
            label: relic.label,
            kind: relic.kind,
            rarity: relic.rarity,
            image_url: relic.image_url,
            description: relic.description,
            obtained_at: userRelic?.obtained_at || null,
            isUnlocked,
            isLocked: !isUnlocked
          };
        });

        setRelics(relicsWithStatus);
      } catch (err) {
        if (!mounted) return;
        console.error('Error fetching user relics:', err);
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