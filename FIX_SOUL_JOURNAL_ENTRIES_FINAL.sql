-- Final fix for soul_journal_entries table to match requirements
-- This ensures the table has the exact structure needed and proper constraints

BEGIN;

-- Ensure the soul_journal_entries table exists with all required columns
CREATE TABLE IF NOT EXISTS public.soul_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  element text,
  prompt_id uuid REFERENCES public.soul_daily_prompts(id),
  intention text,
  reflection text,
  intention_response text,
  reflection_response text,
  soul_star text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns if they don't exist
ALTER TABLE public.soul_journal_entries 
ADD COLUMN IF NOT EXISTS soul_star text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Drop old constraint if it exists with wrong name
ALTER TABLE public.soul_journal_entries 
DROP CONSTRAINT IF EXISTS soul_journal_entries_user_id_entry_date_key;

-- Ensure the correct unique constraint exists (user_id, entry_date, element)
ALTER TABLE public.soul_journal_entries 
DROP CONSTRAINT IF EXISTS soul_journal_entries_user_id_entry_date_element_key;

ALTER TABLE public.soul_journal_entries 
ADD CONSTRAINT soul_journal_entries_user_id_entry_date_element_key 
UNIQUE (user_id, entry_date, element);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS soul_journal_entries_user_date_idx 
  ON public.soul_journal_entries (user_id, entry_date);

CREATE INDEX IF NOT EXISTS soul_journal_entries_user_idx 
  ON public.soul_journal_entries (user_id);

CREATE INDEX IF NOT EXISTS soul_journal_entries_date_idx 
  ON public.soul_journal_entries (entry_date);

-- Enable RLS
ALTER TABLE public.soul_journal_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them clean
DROP POLICY IF EXISTS "users_can_view_own_journal_entries" ON public.soul_journal_entries;
DROP POLICY IF EXISTS "users_can_insert_own_journal_entries" ON public.soul_journal_entries;
DROP POLICY IF EXISTS "users_can_update_own_journal_entries" ON public.soul_journal_entries;
DROP POLICY IF EXISTS "users_can_delete_own_journal_entries" ON public.soul_journal_entries;

-- Create RLS policies
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

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_soul_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_soul_journal_entries_updated_at ON public.soul_journal_entries;
CREATE TRIGGER update_soul_journal_entries_updated_at 
  BEFORE UPDATE ON public.soul_journal_entries 
  FOR EACH ROW EXECUTE FUNCTION update_soul_journal_entries_updated_at();

COMMIT;