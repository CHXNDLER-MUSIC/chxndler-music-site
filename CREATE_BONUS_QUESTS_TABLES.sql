-- Bonus Quests System Tables
-- Creates the tables needed for the heart coin quest system

-- Main bonus quests table (defines available quests)
CREATE TABLE IF NOT EXISTS public.bonus_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_key text NOT NULL UNIQUE CHECK (char_length(quest_key) <= 64),
  title text NOT NULL CHECK (char_length(title) <= 100),
  description text NOT NULL CHECK (char_length(description) <= 500),
  category text NOT NULL CHECK (category IN ('LISTENING', 'SUPPORT', 'COMMUNITY')),
  is_active boolean NOT NULL DEFAULT true,
  is_core boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  max_times_per_day integer NOT NULL DEFAULT 1 CHECK (max_times_per_day >= 0),
  max_total_completions integer CHECK (max_total_completions IS NULL OR max_total_completions > 0),
  reward_heartcoins integer NOT NULL DEFAULT 0 CHECK (reward_heartcoins >= 0),
  reward_element_card boolean NOT NULL DEFAULT false,
  reward_notes text CHECK (char_length(reward_notes) <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User bonus quest completions table (tracks user progress)
CREATE TABLE IF NOT EXISTS public.user_bonus_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  bonus_quest_id uuid NOT NULL REFERENCES public.bonus_quests (id) ON DELETE CASCADE,
  times_completed integer NOT NULL DEFAULT 0 CHECK (times_completed >= 0),
  last_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS bonus_quests_active_idx ON public.bonus_quests (is_active, sort_order);
CREATE INDEX IF NOT EXISTS bonus_quests_quest_key_idx ON public.bonus_quests (quest_key);
CREATE INDEX IF NOT EXISTS user_bonus_quests_user_id_idx ON public.user_bonus_quests (user_id);
CREATE INDEX IF NOT EXISTS user_bonus_quests_quest_id_idx ON public.user_bonus_quests (bonus_quest_id);
CREATE INDEX IF NOT EXISTS user_bonus_quests_user_quest_idx ON public.user_bonus_quests (user_id, bonus_quest_id);

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
DROP TRIGGER IF EXISTS update_bonus_quests_updated_at ON public.bonus_quests;
CREATE TRIGGER update_bonus_quests_updated_at
  BEFORE UPDATE ON public.bonus_quests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_bonus_quests_updated_at ON public.user_bonus_quests;
CREATE TRIGGER update_user_bonus_quests_updated_at
  BEFORE UPDATE ON public.user_bonus_quests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();