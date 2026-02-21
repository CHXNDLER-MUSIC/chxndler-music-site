"use client";

import { useState, useEffect, useMemo } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Badge, UserBadge, BadgeWithProgress, BadgeCategoryData, BADGE_CATEGORIES, AttendanceCounts } from '@/types/badges';
import { getBadgeProgressForUser, formatRequirementText } from '@/lib/badgeProgress';
import { useAttendanceCounts } from '@/hooks/useAttendanceCounts';

export function useBadges() {
  const { user, profile } = useProfile();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch attendance counts for community badges
  const {
    liveStreamCount,
    inPersonCount,
    totalAttendanceCount,
    loading: attendanceLoading,
    error: attendanceError
  } = useAttendanceCounts();

  // Memoize attendance counts for badge progress calculation
  const attendanceCounts: AttendanceCounts = useMemo(() => ({
    liveStreamCount,
    inPersonCount,
    totalAttendanceCount,
  }), [liveStreamCount, inPersonCount, totalAttendanceCount]);

  // Fetch badges from public.badges table
  const fetchBadges = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from('badges')
        .select('*')
        .order('category', { ascending: true })
        .order('requirement_count', { ascending: true });

      if (error) {
        console.error('Error fetching badges:', error);
        setError(`Badges fetch error: ${error.message}`);
        return;
      }

      setBadges(data || []);
    } catch (err) {
      console.error('Error fetching badges:', err);
      setError(`Failed to fetch badges: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Fetch user's earned badges
  const fetchUserBadges = async () => {
    if (!user) {
      setUserBadges([]);
      return;
    }

    try {
      const { data, error } = await supabaseBrowser
        .from('user_badges')
        .select(`
          *,
          badge:badges(*)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user badges:', error);
        setError(error.message);
        return;
      }

      setUserBadges(data || []);
    } catch (err) {
      console.error('Error fetching user badges:', err);
      setError('Failed to fetch user badges');
    }
  };

  // Calculate badge progress using the new data-driven approach
  const calculateBadgeProgress = (badge: Badge): BadgeWithProgress => {
    // Pass attendance counts for community badges that use attendance-based requirements
    const badgeProgress = getBadgeProgressForUser(badge, profile, attendanceCounts);

    // Check if user has earned this badge
    const userBadge = userBadges.find(ub => ub.badge_id === badge.id);
    const unlocked = !!user && !!userBadge;

    return {
      ...badge,
      progress: badgeProgress.percentage,
      current: badgeProgress.current,
      total: badgeProgress.target,
      unlocked: unlocked || badgeProgress.isUnlocked,
    };
  };

  // Get badges organized by categories - filter to show only unlocked badges
  const getBadgeCategories = (): BadgeCategoryData[] => {
    const badgesWithProgress = badges.map(calculateBadgeProgress);

    return [
      {
        id: BADGE_CATEGORIES.SOUL,
        name: "SOUL",
        emoji: "⭐️",
        color: "#FFD700",
        badges: badgesWithProgress.filter(badge => badge.category === BADGE_CATEGORIES.SOUL && badge.unlocked)
      },
      {
        id: BADGE_CATEGORIES.COLLECTOR,
        name: "COLLECTOR",
        emoji: "🏆",
        color: "#38B6FF",
        badges: badgesWithProgress.filter(badge => badge.category === BADGE_CATEGORIES.COLLECTOR && badge.unlocked)
      },
      {
        id: BADGE_CATEGORIES.COMMUNITY,
        name: "COMMUNITY",
        emoji: "🌐",
        color: "#10B981",
        badges: badgesWithProgress.filter(badge => badge.category === BADGE_CATEGORIES.COMMUNITY && badge.unlocked)
      },
      {
        id: BADGE_CATEGORIES.ELEMENTAL_STREAK,
        name: "ELEMENTAL STREAK",
        emoji: "💠",
        color: "#FC54AF",
        badges: badgesWithProgress.filter(badge => badge.category === BADGE_CATEGORIES.ELEMENTAL_STREAK && badge.unlocked)
      },
      {
        id: BADGE_CATEGORIES.CURRENCY,
        name: "CURRENCY",
        emoji: "💰",
        color: "#F59E0B",
        badges: badgesWithProgress.filter(badge => badge.category === BADGE_CATEGORIES.CURRENCY && badge.unlocked)
      },
      {
        id: BADGE_CATEGORIES.LISTENING,
        name: "LISTENING",
        emoji: "🎵",
        color: "#9333EA",
        badges: badgesWithProgress.filter(badge => badge.category === BADGE_CATEGORIES.LISTENING && badge.unlocked)
      }
    ].filter(category => category.badges.length > 0); // Only show categories with badges
  };

  // Award a badge to the current user
  const awardBadge = async (badgeId: string) => {
    if (!user) {
      if (process.env.NODE_ENV !== "production") console.warn('Cannot award badge: no user logged in');
      return false;
    }

    try {
      const { data, error } = await supabaseBrowser
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_id: badgeId
        })
        .select();

      if (error) {
        // Ignore duplicate key errors (user already has this badge)
        if (error.code === '23505') {
          return false;
        }
        console.error('Error awarding badge:', error);
        return false;
      }

      // Refresh user badges
      await fetchUserBadges();
      return true;
    } catch (err) {
      console.error('Error awarding badge:', err);
      return false;
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      // Set a longer timeout to prevent premature failures (increased to 15s)
      const timeoutId = setTimeout(() => {
        setLoading(false);
        setError('Request timed out. Check your connection and try again.');
      }, 15000);
      
      try {
        // Add retry logic for better reliability
        const fetchWithRetry = async (fetchFn: () => Promise<void>, retries = 2) => {
          for (let i = 0; i <= retries; i++) {
            try {
              await fetchFn();
              return;
            } catch (err) {
              if (i === retries) throw err;
              // Wait before retry with exponential backoff
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
          }
        };
        
        // Always fetch badges (public data) with retry
        await fetchWithRetry(fetchBadges);
        
        // Only fetch user badges if we have a valid user
        if (user?.id) {
          await fetchWithRetry(fetchUserBadges);
        } else {
          if (process.env.NODE_ENV !== "production") console.warn('useBadges: No user ID, skipping user badges fetch');
          setUserBadges([]);
        }
        
        clearTimeout(timeoutId);
        setLoading(false);
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('useBadges: Fetch failed:', err);
        setError(`Network error - please check your connection and try again`);
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]); // Re-fetch when user changes

  return {
    badges: badges.map(calculateBadgeProgress), // Legacy compatibility
    badgeCategories: getBadgeCategories(),
    userBadges,
    loading: loading || attendanceLoading,
    error: error || attendanceError,
    awardBadge,
    // Expose attendance counts for community badge UI
    attendanceCounts,
    refetch: () => {
      setLoading(true);
      setError(null);
      fetchBadges().then(() => {
        if (user?.id) {
          return fetchUserBadges();
        }
      }).catch(err => {
        setError(`Retry failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }).finally(() => {
        setLoading(false);
      });
    }
  };
}