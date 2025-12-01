// TypeScript types for bonus quests system

export interface BonusQuestRow {
  id: string;
  quest_key: string;
  title: string;
  description: string;
  category: 'LISTENING' | 'SUPPORT' | 'COMMUNITY';
  is_active: boolean;
  is_core: boolean;
  sort_order: number;
  max_times_per_day: number;
  max_total_completions: number | null;
  reward_heartcoins: number;
  reward_element_card: boolean;
  reward_notes: string;
  created_at: string;
}

export interface UserBonusQuestRow {
  id: string;
  user_id: string;
  bonus_quest_id: string;
  times_completed: number;
  last_completed_at: string | null;
}

export interface BonusQuestWithCompletion extends BonusQuestRow {
  times_completed: number;
  can_complete: boolean;
  completed_today: number;
}

export type QuestKey = 
  | 'LISTEN_ELEMENT_SONG'
  | 'LISTEN_FEATURED_SONG'
  | 'INVITE_FRIEND'
  | 'ATTEND_LIVESTREAM'
  | 'FOLLOW_SPOTIFY'
  | 'FOLLOW_TIKTOK'
  | 'FOLLOW_INSTAGRAM'
  | 'FOLLOW_YOUTUBE';

export interface QuestCompletionResult {
  success: boolean;
  message: string;
  rewards?: {
    heartcoins?: number;
    element_card?: boolean;
  };
}