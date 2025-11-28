-- Setup script to create all soul-related tables in the correct order
-- This ensures the journal and daily prompts functionality works properly

BEGIN;

-- 1. First create the soul_prompts table (this is the base table that others reference)
CREATE TABLE IF NOT EXISTS public.soul_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_type text not null check (prompt_type in ('intention', 'reflection')),
  element text not null check (element in ('heart', 'water', 'lightning', 'darkness')),
  text text not null,
  sort_order integer,
  created_at timestamptz not null default now()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS soul_prompts_type_element_idx
  ON public.soul_prompts (prompt_type, element);

CREATE INDEX IF NOT EXISTS soul_prompts_sort_order_idx
  ON public.soul_prompts (element, prompt_type, sort_order);

-- Enable RLS for soul_prompts
ALTER TABLE public.soul_prompts ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read soul prompts (they're public)
DROP POLICY IF EXISTS "allow_soul_prompts_select_anon" ON public.soul_prompts;
DROP POLICY IF EXISTS "allow_soul_prompts_select_authenticated" ON public.soul_prompts;
DROP POLICY IF EXISTS "service_role_can_manage_soul_prompts" ON public.soul_prompts;

CREATE POLICY "allow_soul_prompts_select_anon"
  ON public.soul_prompts FOR SELECT TO anon
  USING (true);

CREATE POLICY "allow_soul_prompts_select_authenticated"
  ON public.soul_prompts FOR SELECT TO authenticated
  USING (true);

-- Only service role can manage prompts
CREATE POLICY "service_role_can_manage_soul_prompts"
  ON public.soul_prompts FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Create soul_daily_prompts table (references soul_prompts)
CREATE TABLE IF NOT EXISTS public.soul_daily_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_date date not null unique,
  element text not null check (element in ('heart', 'water', 'lightning', 'darkness')),
  intention_prompt_id uuid not null references public.soul_prompts(id),
  reflection_prompt_id uuid not null references public.soul_prompts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index on prompt_date for quick lookups
CREATE INDEX IF NOT EXISTS soul_daily_prompts_date_idx 
  ON public.soul_daily_prompts (prompt_date);

-- Enable RLS for soul_daily_prompts
ALTER TABLE public.soul_daily_prompts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "allow_soul_daily_prompts_select_all" ON public.soul_daily_prompts;
DROP POLICY IF EXISTS "service_role_can_manage_daily_prompts" ON public.soul_daily_prompts;

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

-- 3. Create soul_journal_entries table (may reference soul_daily_prompts)
CREATE TABLE IF NOT EXISTS public.soul_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  element text not null check (element in ('heart', 'water', 'lightning', 'darkness')),
  prompt_id uuid REFERENCES public.soul_daily_prompts(id),
  intention text,
  reflection text,
  intention_response text,
  reflection_response text,
  soul_star text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure one entry per user per date per element
  CONSTRAINT soul_journal_entries_user_id_entry_date_element_key 
  UNIQUE (user_id, entry_date, element)
);

-- Create indexes for quick lookups
CREATE INDEX IF NOT EXISTS soul_journal_entries_user_date_idx 
  ON public.soul_journal_entries (user_id, entry_date);

CREATE INDEX IF NOT EXISTS soul_journal_entries_user_idx 
  ON public.soul_journal_entries (user_id);

-- Enable RLS for soul_journal_entries
ALTER TABLE public.soul_journal_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_can_view_own_journal_entries" ON public.soul_journal_entries;
DROP POLICY IF EXISTS "users_can_insert_own_journal_entries" ON public.soul_journal_entries;
DROP POLICY IF EXISTS "users_can_update_own_journal_entries" ON public.soul_journal_entries;
DROP POLICY IF EXISTS "users_can_delete_own_journal_entries" ON public.soul_journal_entries;

-- RLS policies for soul_journal_entries
CREATE POLICY "users_can_view_own_journal_entries"
  ON public.soul_journal_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_journal_entries"
  ON public.soul_journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_journal_entries"
  ON public.soul_journal_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_journal_entries"
  ON public.soul_journal_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Create or replace the function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create triggers to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_soul_daily_prompts_updated_at ON soul_daily_prompts;
DROP TRIGGER IF EXISTS update_soul_journal_entries_updated_at ON soul_journal_entries;

CREATE TRIGGER update_soul_daily_prompts_updated_at 
  BEFORE UPDATE ON soul_daily_prompts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_soul_journal_entries_updated_at 
  BEFORE UPDATE ON soul_journal_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;