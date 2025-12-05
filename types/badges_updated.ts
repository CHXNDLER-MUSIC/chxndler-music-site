// Updated Badge types for Supabase integration

export interface Badge {
  id: string;
  title: string;
  description: string | null;
  element: string | null;
  image_url: string | null;
  requirement_type: string;
  requirement_value: string | null;
  category: string;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
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
  unlocked_at?: string; // when badge was unlocked
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

// Requirement types for badge unlocking
export const REQUIREMENT_TYPES = {
  SOUL_ENTRIES: 'soul_entries',
  TRACKS_LISTENED: 'tracks_listened',
  DAILY_QUESTS: 'daily_quests',
  ITEMS_COLLECTED: 'items_collected',
  LIVE_EVENTS: 'live_events',
  ELEMENT_STREAK: 'element_streak',
  HEARTCOINS_EARNED: 'heartcoins_earned',
  HEARTCOINS_SPENT: 'heartcoins_spent',
  MERCH_PURCHASES: 'merch_purchases',
  COMMUNITY_DAYS: 'community_days',
  SHARES_MADE: 'shares_made',
  FRIENDS_INVITED: 'friends_invited',
  EVENTS_HOSTED: 'events_hosted',
  LOGIN_STREAK: 'login_streak',
  LIVE_STREAMS: 'live_streams',
  PROFILE_CREATED: 'profile_created'
} as const;

export interface UserProgress {
  soul_entries: number;
  tracks_listened: number;
  daily_quests: number;
  items_collected: number;
  live_events: number;
  heartcoins_earned: number;
  heartcoins_spent: number;
  merch_purchases: number;
  community_days: number;
  shares_made: number;
  friends_invited: number;
  events_hosted: number;
  login_streak: number;
  live_streams: number;
  element_streaks: Record<string, number>; // element -> streak count
}