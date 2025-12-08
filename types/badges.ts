// Badge types for Supabase integration

export type BadgeCategory = 
  | 'elemental-streak'
  | 'collector'
  | 'currency'
  | 'soul'
  | 'listening'
  | 'community';

export interface Badge {
  id: string;
  badge_name: string;
  icon_url: string | null;
  description: string | null;
  requirement: string | null;
  category: BadgeCategory;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge; // For joined queries
}

export interface BadgeCategoryData {
  id: BadgeCategory;
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
}

// Badge category definitions
export const BADGE_CATEGORIES: Record<string, BadgeCategory> = {
  ELEMENTAL_STREAK: 'elemental-streak',
  COLLECTOR: 'collector',
  CURRENCY: 'currency',
  SOUL: 'soul',
  LISTENING: 'listening',
  COMMUNITY: 'community'
} as const;