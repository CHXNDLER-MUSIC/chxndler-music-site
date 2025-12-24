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
  slug: string;
  icon_url: string | null;
  description: string | null;
  requirement_text: string | null;
  requirement_type: string;
  requirement_count: number;
  category: BadgeCategory;
  sub_category?: string | null;
  created_at: string;
}

export interface BadgeDefinition {
  id: string;
  slug: string;
  badge_name: string;
  description: string | null;
  requirement_type: string;
  requirement_count: number;
  icon_url: string | null;
  category: string | null;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge; // For joined queries
}

export interface Profile {
  id: string;
  email?: string;
  phone?: string;
  display_name?: string;
  avatar_url?: string;
  selected_element?: string;
  journey_tag?: string;
  tier?: string;
  heartcoin_balance: number;
  has_completed_onboarding?: boolean;
  has_seen_tour?: boolean;
  // Counter columns for badge progress
  total_reflections: number;
  total_listening_minutes: number;
  total_heartcoins_earned: number;
  elemental_sessions_count: number;
  community_interactions: number;
  achievements_unlocked: number;
  streams_attended: number;
  concerts_attended: number;
  cards_owned: number;
  merch_items_owned: number;
  donations_made: number;
  heartcoins_sent: number;
  unique_songs_count: number;
  created_at: string;
  updated_at: string;
}

export interface BadgeProgress {
  current: number;
  target: number;
  percentage: number; // 0–100
  isUnlocked: boolean;
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

// Attendance counts for community badge progress
export interface AttendanceCounts {
  liveStreamCount: number;
  inPersonCount: number;
  totalAttendanceCount: number;
}