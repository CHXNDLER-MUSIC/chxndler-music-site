-- Create the missing user_bonus_quest_completions table for daily tracking
-- This table tracks individual completion events for daily quest resets

CREATE TABLE IF NOT EXISTS public.user_bonus_quest_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  bonus_quest_id uuid NOT NULL REFERENCES public.bonus_quests (id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS user_bonus_quest_completions_user_id_idx ON public.user_bonus_quest_completions (user_id);
CREATE INDEX IF NOT EXISTS user_bonus_quest_completions_quest_id_idx ON public.user_bonus_quest_completions (bonus_quest_id);
CREATE INDEX IF NOT EXISTS user_bonus_quest_completions_date_idx ON public.user_bonus_quest_completions (completed_at);
CREATE INDEX IF NOT EXISTS user_bonus_quest_completions_user_quest_date_idx ON public.user_bonus_quest_completions (user_id, bonus_quest_id, completed_at);

-- Enable Row Level Security
ALTER TABLE public.user_bonus_quest_completions ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own completions
CREATE POLICY "Users can view own quest completions" ON public.user_bonus_quest_completions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own completions
CREATE POLICY "Users can insert own quest completions" ON public.user_bonus_quest_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);