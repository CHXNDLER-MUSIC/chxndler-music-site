-- Create soul_daily_prompts table to store daily selected prompts
CREATE TABLE IF NOT EXISTS public.soul_daily_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_date date not null unique,
  element text not null check (element in ('heart', 'water', 'lightning', 'darkness')),
  intention_prompt_id uuid not null references soul_prompts(id),
  reflection_prompt_id uuid not null references soul_prompts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index on prompt_date for quick lookups
CREATE INDEX IF NOT EXISTS soul_daily_prompts_date_idx 
  ON public.soul_daily_prompts (prompt_date);

-- Create soul_journal_entries table to store user journal entries
CREATE TABLE IF NOT EXISTS public.soul_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  element text not null check (element in ('heart', 'water', 'lightning', 'darkness')),
  intention text,
  reflection text,
  soul_star text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure one entry per user per date
  unique(user_id, entry_date)
);

-- Create indexes for quick lookups
CREATE INDEX IF NOT EXISTS soul_journal_entries_user_date_idx 
  ON public.soul_journal_entries (user_id, entry_date);

CREATE INDEX IF NOT EXISTS soul_journal_entries_user_idx 
  ON public.soul_journal_entries (user_id);

-- Enable RLS for soul_journal_entries
ALTER TABLE public.soul_journal_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for soul_journal_entries
-- Users can only see their own entries
CREATE POLICY "users_can_view_own_journal_entries"
  ON public.soul_journal_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own entries
CREATE POLICY "users_can_insert_own_journal_entries"
  ON public.soul_journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries
CREATE POLICY "users_can_update_own_journal_entries"
  ON public.soul_journal_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "users_can_delete_own_journal_entries"
  ON public.soul_journal_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable RLS for soul_daily_prompts
ALTER TABLE public.soul_daily_prompts ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read daily prompts (they're public)
CREATE POLICY "allow_soul_daily_prompts_select_all"
  ON public.soul_daily_prompts FOR SELECT
  USING (true);

-- Only service role can insert/update daily prompts
CREATE POLICY "service_role_can_manage_daily_prompts"
  ON public.soul_daily_prompts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update the updated_at column
CREATE TRIGGER update_soul_daily_prompts_updated_at 
  BEFORE UPDATE ON soul_daily_prompts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_soul_journal_entries_updated_at 
  BEFORE UPDATE ON soul_journal_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();