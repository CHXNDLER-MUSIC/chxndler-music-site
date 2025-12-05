-- Create soul_journal table with required columns and constraints
-- This replaces the soul_journal_entries table structure

BEGIN;

-- Create the soul_journal table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.soul_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  element text NOT NULL CHECK (element IN ('heart', 'water', 'lightning', 'darkness')),
  intention text,
  prompt text,
  reflection_response text,
  intention_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add the unique constraint for (user_id, entry_date)
ALTER TABLE public.soul_journal 
ADD CONSTRAINT IF NOT EXISTS soul_journal_unique_user_date
UNIQUE (user_id, entry_date);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS soul_journal_user_date_idx 
  ON public.soul_journal (user_id, entry_date);

CREATE INDEX IF NOT EXISTS soul_journal_user_idx 
  ON public.soul_journal (user_id);

CREATE INDEX IF NOT EXISTS soul_journal_date_idx 
  ON public.soul_journal (entry_date);

-- Enable RLS
ALTER TABLE public.soul_journal ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_can_view_own_soul_journal" ON public.soul_journal;
DROP POLICY IF EXISTS "users_can_insert_own_soul_journal" ON public.soul_journal;
DROP POLICY IF EXISTS "users_can_update_own_soul_journal" ON public.soul_journal;
DROP POLICY IF EXISTS "users_can_delete_own_soul_journal" ON public.soul_journal;

-- Create RLS policies
CREATE POLICY "users_can_view_own_soul_journal"
  ON public.soul_journal FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_soul_journal"
  ON public.soul_journal FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_soul_journal"
  ON public.soul_journal FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_soul_journal"
  ON public.soul_journal FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_soul_journal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_soul_journal_updated_at ON public.soul_journal;
CREATE TRIGGER update_soul_journal_updated_at 
  BEFORE UPDATE ON public.soul_journal 
  FOR EACH ROW EXECUTE FUNCTION update_soul_journal_updated_at();

COMMIT;