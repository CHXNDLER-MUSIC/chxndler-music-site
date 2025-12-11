-- Add missing is_public column to soul_journal_entries table
-- This column is used to control whether journal entries are visible publicly or private

BEGIN;

-- Add the is_public column with a default value of false (private by default)
ALTER TABLE public.soul_journal_entries 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Update existing entries to be private by default (if any exist)
UPDATE public.soul_journal_entries 
SET is_public = false 
WHERE is_public IS NULL;

-- Add an index for performance on public entries queries
CREATE INDEX IF NOT EXISTS soul_journal_entries_is_public_idx 
  ON public.soul_journal_entries (is_public);

-- Create a partial index for public entries only (more efficient)
CREATE INDEX IF NOT EXISTS soul_journal_entries_public_entries_idx 
  ON public.soul_journal_entries (user_id, entry_date) 
  WHERE is_public = true;

COMMIT;