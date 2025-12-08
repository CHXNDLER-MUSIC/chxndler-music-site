-- Fix the soul_journal_entries table to resolve database errors
-- This ensures all required columns exist and constraints are correct

BEGIN;

-- Ensure the soul_journal_entries table has all required columns
ALTER TABLE public.soul_journal_entries 
ADD COLUMN IF NOT EXISTS prompt_id uuid REFERENCES public.soul_daily_prompts(id),
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Remove old constraint that might conflict
ALTER TABLE public.soul_journal_entries 
DROP CONSTRAINT IF EXISTS soul_journal_entries_user_id_entry_date_key;

-- Ensure correct unique constraint exists
ALTER TABLE public.soul_journal_entries 
DROP CONSTRAINT IF EXISTS soul_journal_entries_user_id_entry_date_element_key;

ALTER TABLE public.soul_journal_entries 
ADD CONSTRAINT soul_journal_entries_user_id_entry_date_element_key 
UNIQUE (user_id, entry_date, element);

-- Ensure RLS policies are in place
ALTER TABLE public.soul_journal_entries ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "users_can_view_own_journal_entries" ON public.soul_journal_entries;
DROP POLICY IF EXISTS "users_can_insert_own_journal_entries" ON public.soul_journal_entries;
DROP POLICY IF EXISTS "users_can_update_own_journal_entries" ON public.soul_journal_entries;
DROP POLICY IF EXISTS "users_can_delete_own_journal_entries" ON public.soul_journal_entries;

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

COMMIT;