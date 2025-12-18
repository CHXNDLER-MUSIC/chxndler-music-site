'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

export interface BadgeCelebrationItem {
  id: string;           // user_badges row id for deduplication
  badgeId: string;
  badgeName: string;
  iconUrl: string;
  heartCoins: number;
}

interface UserBadgeInsert {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

interface Badge {
  id: string;
  badge_name: string;
  icon_url: string;
  heart_coins: number;
}

interface UseBadgeCelebrationsReturn {
  next: BadgeCelebrationItem | null;
  pop: () => void;
  queueLength: number;
}

export function useBadgeCelebrations(userId: string | null): UseBadgeCelebrationsReturn {
  const [queue, setQueue] = useState<BadgeCelebrationItem[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const pop = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to realtime INSERT events on user_badges
    const channel = supabaseBrowser
      .channel('user-badges-realtime')
      .on<UserBadgeInsert>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${userId}`,
        },
        async (payload: RealtimePostgresInsertPayload<UserBadgeInsert>) => {
          const newRow = payload.new;

          // Skip if we've already seen this badge (reconnect-safe deduplication)
          if (seenIdsRef.current.has(newRow.id)) {
            return;
          }
          seenIdsRef.current.add(newRow.id);

          // Fetch badge details from public.badges
          const { data: badge, error } = await supabaseBrowser
            .from('badges')
            .select('id, badge_name, icon_url, heart_coins')
            .eq('id', newRow.badge_id)
            .single();

          if (error || !badge) {
            console.error('Failed to fetch badge details:', error);
            return;
          }

          const celebrationItem: BadgeCelebrationItem = {
            id: newRow.id,
            badgeId: badge.id,
            badgeName: badge.badge_name,
            iconUrl: badge.icon_url || '/elements/badge-default.webp',
            heartCoins: badge.heart_coins ?? 0,
          };

          // Add to queue
          setQueue((prev) => [...prev, celebrationItem]);
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Badge celebrations subscription status:', status);
        }
      });

    // Cleanup on unmount or userId change
    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [userId]);

  return {
    next: queue[0] ?? null,
    pop,
    queueLength: queue.length,
  };
}
