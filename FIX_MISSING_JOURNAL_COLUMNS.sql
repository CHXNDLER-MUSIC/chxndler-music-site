-- Add missing columns to soul_journal_entries table

BEGIN;

-- Add is_private column if it doesn't exist
ALTER TABLE public.soul_journal_entries 
ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Add created_date column if it doesn't exist (duplicate of created_at for interface compatibility)
ALTER TABLE public.soul_journal_entries 
ADD COLUMN IF NOT EXISTS created_date timestamptz NOT NULL DEFAULT now();

-- Update created_date to match created_at for existing records
UPDATE public.soul_journal_entries 
SET created_date = created_at 
WHERE created_date IS NULL OR created_date != created_at;

-- Create a trigger to keep created_date in sync with created_at for new records
CREATE OR REPLACE FUNCTION sync_soul_journal_created_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_date = NEW.created_at;
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_soul_journal_created_date_trigger ON public.soul_journal_entries;

-- Create trigger to sync created_date with created_at
CREATE TRIGGER sync_soul_journal_created_date_trigger
  BEFORE INSERT OR UPDATE ON public.soul_journal_entries
  FOR EACH ROW EXECUTE FUNCTION sync_soul_journal_created_date();

COMMIT;