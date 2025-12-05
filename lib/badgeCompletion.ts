"use client";

import { supabaseClient } from '@/lib/supabaseClient';

export interface BadgeCompletionStats {
  totalBadges: number;
  completedBadges: number;
  completionPercentage: number;
  badgesByCategory: Record<string, {
    total: number;
    completed: number;
    percentage: number;
  }>;
}

export async function calculateBadgeCompletion(userId: string): Promise<BadgeCompletionStats> {
  try {
    // Get total badges
    const { data: allBadges, error: badgesError } = await supabaseClient
      .from('badges')
      .select('id, category');

    if (badgesError) {
      throw badgesError;
    }

    // Get user's unlocked badges
    const { data: userBadges, error: userBadgesError } = await supabaseClient
      .from('user_badges')
      .select('badge_id, badge:badges(category)')
      .eq('user_id', userId);

    if (userBadgesError) {
      throw userBadgesError;
    }

    const totalBadges = allBadges?.length || 0;
    const completedBadges = userBadges?.length || 0;
    const completionPercentage = totalBadges > 0 ? Math.round((completedBadges / totalBadges) * 100) : 0;

    // Calculate by category
    const badgesByCategory: Record<string, { total: number; completed: number; percentage: number }> = {};
    
    // Initialize categories with totals
    for (const badge of allBadges || []) {
      if (!badgesByCategory[badge.category]) {
        badgesByCategory[badge.category] = { total: 0, completed: 0, percentage: 0 };
      }
      badgesByCategory[badge.category].total++;
    }

    // Count completed by category
    for (const userBadge of userBadges || []) {
      const category = userBadge.badge?.category;
      if (category && badgesByCategory[category]) {
        badgesByCategory[category].completed++;
      }
    }

    // Calculate category percentages
    for (const category in badgesByCategory) {
      const categoryData = badgesByCategory[category];
      categoryData.percentage = categoryData.total > 0 
        ? Math.round((categoryData.completed / categoryData.total) * 100) 
        : 0;
    }

    return {
      totalBadges,
      completedBadges,
      completionPercentage,
      badgesByCategory
    };
  } catch (error) {
    console.error('Error calculating badge completion:', error);
    return {
      totalBadges: 0,
      completedBadges: 0,
      completionPercentage: 0,
      badgesByCategory: {}
    };
  }
}

export async function getBadgeLeaderboard(limit: number = 10): Promise<Array<{
  user_id: string;
  badge_count: number;
  completion_percentage: number;
}>> {
  try {
    const { data, error } = await supabaseClient
      .rpc('get_badge_leaderboard', { result_limit: limit });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching badge leaderboard:', error);
    return [];
  }
}

// SQL function for leaderboard (add to migration):
export const BADGE_LEADERBOARD_FUNCTION = `
CREATE OR REPLACE FUNCTION get_badge_leaderboard(result_limit INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  badge_count BIGINT,
  completion_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH badge_counts AS (
    SELECT 
      ub.user_id,
      COUNT(ub.badge_id) as badges_earned,
      (SELECT COUNT(*) FROM badges) as total_badges
    FROM user_badges ub
    GROUP BY ub.user_id
  )
  SELECT 
    bc.user_id,
    bc.badges_earned,
    ROUND((bc.badges_earned::NUMERIC / bc.total_badges::NUMERIC) * 100, 2) as completion_percentage
  FROM badge_counts bc
  ORDER BY bc.badges_earned DESC, completion_percentage DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;