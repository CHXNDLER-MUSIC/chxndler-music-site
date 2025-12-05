"use client";

import { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { supabaseClient } from '@/lib/supabaseClient';
import { Badge, UserBadge, BadgeWithProgress, BadgeCategory, BADGE_CATEGORIES, UserProgress, REQUIREMENT_TYPES } from '@/types/badges_updated';

export function useBadges() {
  const { user, profile } = useProfile();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all badges
  const fetchBadges = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('badges')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching badges:', error);
        setError(error.message);
        return;
      }

      setBadges(data || []);
    } catch (err) {
      console.error('Error fetching badges:', err);
      setError('Failed to fetch badges');
    }
  };

  // Fetch user's earned badges
  const fetchUserBadges = async () => {
    if (!user) {
      setUserBadges([]);
      return;
    }

    try {
      const { data, error } = await supabaseClient
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

  // Fetch user progress data (this would be expanded with real progress tracking)
  const fetchUserProgress = async () => {
    if (!user) {
      setUserProgress(null);
      return;
    }

    try {
      // This is a placeholder. In a real implementation, you would fetch from multiple tables:
      // - soul_journal for soul_entries
      // - listening_history for tracks_listened  
      // - daily_quests for daily_quests
      // - purchases for heartcoins_spent/merch_purchases
      // - user_profile for login_streak, etc.
      
      const mockProgress: UserProgress = {
        soul_entries: 0,
        tracks_listened: 0,
        daily_quests: 0,
        items_collected: 0,
        live_events: 0,
        heartcoins_earned: profile?.heartcoins || 0,
        heartcoins_spent: 0,
        merch_purchases: 0,
        community_days: 0,
        shares_made: 0,
        friends_invited: 0,
        events_hosted: 0,
        login_streak: 0,
        live_streams: 0,
        element_streaks: {}
      };

      setUserProgress(mockProgress);
    } catch (err) {
      console.error('Error fetching user progress:', err);
    }
  };

  // Calculate badge progress based on user data
  const calculateBadgeProgress = (badge: Badge): BadgeWithProgress => {
    const userBadge = userBadges.find(ub => ub.badge_id === badge.id);
    const unlocked = !!userBadge;
    
    if (!userProgress) {
      return {
        ...badge,
        progress: 0,
        current: 0,
        total: 1,
        unlocked,
        unlocked_at: userBadge?.unlocked_at
      };
    }

    let progress = 0;
    let current = 0;
    let total = 1;

    // Parse requirement value
    const reqValue = badge.requirement_value || '1';
    
    switch (badge.requirement_type) {
      case REQUIREMENT_TYPES.SOUL_ENTRIES:
        total = parseInt(reqValue);
        current = userProgress.soul_entries;
        break;
        
      case REQUIREMENT_TYPES.TRACKS_LISTENED:
        if (reqValue === 'all') {
          total = 50; // Assume total discography size
          current = userProgress.tracks_listened;
        } else {
          total = parseInt(reqValue);
          current = userProgress.tracks_listened;
        }
        break;
        
      case REQUIREMENT_TYPES.DAILY_QUESTS:
        total = parseInt(reqValue);
        current = userProgress.daily_quests;
        break;
        
      case REQUIREMENT_TYPES.ELEMENT_STREAK:
        const [streakDays, element] = reqValue.split(':');
        total = parseInt(streakDays);
        current = userProgress.element_streaks[element] || 0;
        break;
        
      case REQUIREMENT_TYPES.HEARTCOINS_EARNED:
        total = parseInt(reqValue);
        current = userProgress.heartcoins_earned;
        break;
        
      case REQUIREMENT_TYPES.HEARTCOINS_SPENT:
        total = parseInt(reqValue);
        current = userProgress.heartcoins_spent;
        break;
        
      case REQUIREMENT_TYPES.LOGIN_STREAK:
        total = parseInt(reqValue);
        current = userProgress.login_streak;
        break;
        
      case REQUIREMENT_TYPES.PROFILE_CREATED:
        total = 1;
        current = user ? 1 : 0;
        break;
        
      default:
        total = parseInt(reqValue) || 1;
        current = 0;
    }

    progress = unlocked ? 100 : Math.min(Math.round((current / total) * 100), 99);

    return {
      ...badge,
      progress,
      current,
      total,
      unlocked,
      unlocked_at: userBadge?.unlocked_at
    };
  };

  // Get badges organized by categories
  const getBadgeCategories = (): BadgeCategory[] => {
    const badgesWithProgress = badges.map(calculateBadgeProgress);

    return [
      {
        id: BADGE_CATEGORIES.SOUL_STAR,
        name: "SOUL STAR",
        emoji: "⭐️",
        color: "#FFD700",
        badges: badgesWithProgress.filter(badge => badge.category === BADGE_CATEGORIES.SOUL_STAR)
      },
      {
        id: BADGE_CATEGORIES.ACHIEVEMENTS,
        name: "ACHIEVEMENTS",
        emoji: "🏆",
        color: "#38B6FF",
        badges: badgesWithProgress.filter(badge => badge.category === BADGE_CATEGORIES.ACHIEVEMENTS)
      },
      {
        id: BADGE_CATEGORIES.ELEMENTAL_STREAK,
        name: "ELEMENTAL STREAK",
        emoji: "💠",
        color: "#FC54AF",
        badges: badgesWithProgress.filter(badge => badge.category === BADGE_CATEGORIES.ELEMENTAL_STREAK)
      },
      {
        id: BADGE_CATEGORIES.LISTENING,
        name: "LISTENING",
        emoji: "🎵",
        color: "#9333EA",
        badges: badgesWithProgress.filter(badge => badge.category === BADGE_CATEGORIES.LISTENING)
      },
      {
        id: BADGE_CATEGORIES.HEARTCOIN,
        name: "HEARTCOIN",
        emoji: "💰",
        color: "#F59E0B",
        badges: badgesWithProgress.filter(badge => badge.category === BADGE_CATEGORIES.HEARTCOIN)
      },
      {
        id: BADGE_CATEGORIES.COMMUNITY,
        name: "COMMUNITY",
        emoji: "🌐",
        color: "#10B981",
        badges: badgesWithProgress.filter(badge => badge.category === BADGE_CATEGORIES.COMMUNITY)
      }
    ].filter(category => category.badges.length > 0);
  };

  // Award a badge to the current user
  const awardBadge = async (badgeId: string) => {
    if (!user) {
      console.warn('Cannot award badge: no user logged in');
      return false;
    }

    try {
      const { data, error } = await supabaseClient
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

  // Check if user qualifies for any new badges
  const checkForNewBadges = async () => {
    if (!user || !userProgress) return;

    const unlockedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
    
    for (const badge of badges) {
      if (unlockedBadgeIds.has(badge.id)) continue;
      
      const badgeWithProgress = calculateBadgeProgress(badge);
      if (badgeWithProgress.progress >= 100) {
        await awardBadge(badge.id);
      }
    }
  };

  // Calculate completion percentage
  const getCompletionPercentage = (): number => {
    if (badges.length === 0) return 0;
    return Math.round((userBadges.length / badges.length) * 100);
  };

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchBadges(),
        fetchUserBadges(),
        fetchUserProgress()
      ]);
      
      setLoading(false);
    };

    fetchData();
  }, [user?.id]);

  // Check for new badges when progress updates
  useEffect(() => {
    if (!loading && userProgress) {
      checkForNewBadges();
    }
  }, [userProgress, loading]);

  return {
    badges,
    userBadges,
    userProgress,
    badgeCategories: getBadgeCategories(),
    completionPercentage: getCompletionPercentage(),
    loading,
    error,
    awardBadge,
    checkForNewBadges,
    refetch: () => {
      fetchBadges();
      fetchUserBadges();
      fetchUserProgress();
    }
  };
}