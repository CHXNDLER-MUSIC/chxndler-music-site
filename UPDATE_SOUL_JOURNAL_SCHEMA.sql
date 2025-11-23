-- Update soul_journal_entries table to match the new schema requirements

BEGIN;

-- First, drop the existing unique constraint if it exists
ALTER TABLE public.soul_journal_entries 
DROP CONSTRAINT IF EXISTS soul_journal_entries_user_id_entry_date_key;

-- Add the new columns if they don't exist
ALTER TABLE public.soul_journal_entries 
ADD COLUMN IF NOT EXISTS prompt_id uuid REFERENCES soul_daily_prompts(id),
ADD COLUMN IF NOT EXISTS intention_response text,
ADD COLUMN IF NOT EXISTS reflection_response text;

-- Create the new composite unique constraint including element
ALTER TABLE public.soul_journal_entries 
ADD CONSTRAINT soul_journal_entries_user_id_entry_date_element_key 
UNIQUE (user_id, entry_date, element);

-- Update RLS policies to be more specific
DROP POLICY IF EXISTS "users_can_view_own_journal_entries" ON public.soul_journal_entries;
DROP POLICY IF EXISTS "users_can_insert_own_journal_entries" ON public.soul_journal_entries;
DROP POLICY IF EXISTS "users_can_update_own_journal_entries" ON public.soul_journal_entries;
DROP POLICY IF EXISTS "users_can_delete_own_journal_entries" ON public.soul_journal_entries;

-- Create updated RLS policies
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