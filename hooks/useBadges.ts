"use client";

import { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { supabaseClient } from '@/lib/supabaseClient';
import { Badge, UserBadge, BadgeWithProgress, BadgeCategory, BADGE_CATEGORIES } from '@/types/badges';

export function useBadges() {
  const { user, profile } = useProfile();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
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

  // Calculate badge progress (this would be enhanced with actual tracking data)
  const calculateBadgeProgress = (badge: Badge): BadgeWithProgress => {
    const userBadge = userBadges.find(ub => ub.badge_id === badge.id);
    const unlocked = !!userBadge;

    // For demo purposes, using some mock progress calculations
    // In a real implementation, this would query actual user activity data
    let progress = 0;
    let current = 0;
    let total = 1;

    if (badge.badge_name.includes('First')) {
      // First-time achievements
      total = 1;
      current = unlocked ? 1 : 0;
      progress = unlocked ? 100 : 0;
    } else if (badge.badge_name.includes('Soul')) {
      // Soul/reflection badges
      const reflectionCount = Math.floor(Math.random() * 15); // Mock data
      if (badge.badge_name.includes('Star')) total = 1;
      else if (badge.badge_name.includes('Ember')) total = 3;
      else if (badge.badge_name.includes('Flame')) total = 7;
      else if (badge.badge_name.includes('Bloom')) total = 14;
      else if (badge.badge_name.includes('Rise')) total = 30;
      else if (badge.badge_name.includes('Eclipse')) total = 50;
      else if (badge.badge_name.includes('Eternal')) total = 100;
      
      current = Math.min(reflectionCount, total);
      progress = unlocked ? 100 : Math.round((current / total) * 100);
    } else {
      // Other badges with mock progress
      total = Math.floor(Math.random() * 20) + 1;
      current = unlocked ? total : Math.floor(Math.random() * total);
      progress = unlocked ? 100 : Math.round((current / total) * 100);
    }

    return {
      ...badge,
      progress,
      current,
      total,
      unlocked,
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
        badges: badgesWithProgress.filter(badge => 
          badge.badge_name.toLowerCase().includes('soul') ||
          badge.badge_name.toLowerCase().includes('reflection')
        )
      },
      {
        id: BADGE_CATEGORIES.ACHIEVEMENTS,
        name: "ACHIEVEMENTS",
        emoji: "🏆",
        color: "#38B6FF",
        badges: badgesWithProgress.filter(badge => 
          badge.badge_name.toLowerCase().includes('first') ||
          badge.badge_name.toLowerCase().includes('collector') ||
          badge.badge_name.toLowerCase().includes('witness') ||
          badge.badge_name.toLowerCase().includes('supporter')
        )
      },
      {
        id: BADGE_CATEGORIES.ELEMENTAL_STREAK,
        name: "ELEMENTAL STREAK",
        emoji: "💠",
        color: "#FC54AF",
        badges: badgesWithProgress.filter(badge => 
          badge.badge_name.toLowerCase().includes('heart') ||
          badge.badge_name.toLowerCase().includes('water') ||
          badge.badge_name.toLowerCase().includes('lightning') ||
          badge.badge_name.toLowerCase().includes('darkness') ||
          badge.badge_name.toLowerCase().includes('element')
        )
      },
      {
        id: BADGE_CATEGORIES.LISTENING,
        name: "LISTENING",
        emoji: "🎵",
        color: "#9333EA",
        badges: badgesWithProgress.filter(badge => 
          badge.badge_name.toLowerCase().includes('listen') ||
          badge.badge_name.toLowerCase().includes('track') ||
          badge.badge_name.toLowerCase().includes('song') ||
          badge.badge_name.toLowerCase().includes('music')
        )
      },
      {
        id: BADGE_CATEGORIES.HEARTCOIN,
        name: "HEARTCOIN",
        emoji: "💰",
        color: "#F59E0B",
        badges: badgesWithProgress.filter(badge => 
          badge.badge_name.toLowerCase().includes('coin') ||
          badge.badge_name.toLowerCase().includes('treasure') ||
          badge.badge_name.toLowerCase().includes('prosperity')
        )
      },
      {
        id: BADGE_CATEGORIES.COMMUNITY,
        name: "COMMUNITY",
        emoji: "🌐",
        color: "#10B981",
        badges: badgesWithProgress.filter(badge => 
          badge.badge_name.toLowerCase().includes('community') ||
          badge.badge_name.toLowerCase().includes('friend') ||
          badge.badge_name.toLowerCase().includes('invite') ||
          badge.badge_name.toLowerCase().includes('follow')
        )
      }
    ].filter(category => category.badges.length > 0); // Only show categories with badges
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

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchBadges(),
        fetchUserBadges()
      ]);
      
      setLoading(false);
    };

    fetchData();
  }, [user?.id]); // Re-fetch when user changes

  return {
    badges,
    userBadges,
    badgeCategories: getBadgeCategories(),
    loading,
    error,
    awardBadge,
    refetch: () => {
      fetchBadges();
      fetchUserBadges();
    }
  };
}