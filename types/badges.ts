// Badge types for Supabase integration

export interface Badge {
  id: string;
  badge_name: string;
  icon_url: string | null;
  description: string | null;
  requirement: string | null;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge; // For joined queries
}

export interface BadgeCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  badges: BadgeWithProgress[];
}

export interface BadgeWithProgress extends Badge {
  progress?: number; // 0-100 percentage
  current?: number; // current progress value
  total?: number; // total requirement for badge
  unlocked?: boolean; // whether user has earned this badge
  category?: string; // badge category for filtering
}

// Badge category definitions
export const BADGE_CATEGORIES = {
  SOUL_STAR: 'soul-star',
  ACHIEVEMENTS: 'achievements', 
  ELEMENTAL_STREAK: 'elemental-streak',
  LISTENING: 'listening',
  HEARTCOIN: 'heartcoin',
  COMMUNITY: 'community'
} as const;

export type BadgeCategoryId = typeof BADGE_CATEGORIES[keyof typeof BADGE_CATEGORIES];