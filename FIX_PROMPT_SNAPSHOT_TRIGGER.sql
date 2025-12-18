-- Fix trigger that references old 'prompt_snapshot' column (now renamed to 'prompt')
-- Run this in Supabase SQL Editor

BEGIN;

-- First, let's see what triggers exist on the table
-- SELECT tgname, tgrelid::regclass, pg_get_triggerdef(oid)
-- FROM pg_trigger
-- WHERE tgrelid = 'public.soul_journal_entries'::regclass;

-- Drop any trigger that might be referencing prompt_snapshot
DROP TRIGGER IF EXISTS set_prompt_snapshot_trigger ON public.soul_journal_entries;
DROP TRIGGER IF EXISTS copy_prompt_snapshot_trigger ON public.soul_journal_entries;
DROP TRIGGER IF EXISTS populate_prompt_snapshot ON public.soul_journal_entries;
DROP TRIGGER IF EXISTS soul_journal_entries_prompt_snapshot_trigger ON public.soul_journal_entries;

-- Drop any function that might reference prompt_snapshot
DROP FUNCTION IF EXISTS set_prompt_snapshot();
DROP FUNCTION IF EXISTS copy_prompt_snapshot();
DROP FUNCTION IF EXISTS populate_prompt_snapshot();
DROP FUNCTION IF EXISTS soul_journal_entries_set_prompt_snapshot();

-- If you want to auto-populate the 'prompt' column from soul_daily_prompts when inserting,
-- here's the corrected trigger using 'prompt' instead of 'prompt_snapshot':

CREATE OR REPLACE FUNCTION populate_journal_prompt()
RETURNS TRIGGER AS $$
BEGIN
  -- Only populate if prompt is null and prompt_id is provided
  IF NEW.prompt IS NULL AND NEW.prompt_id IS NOT NULL THEN
    SELECT prompt INTO NEW.prompt
    FROM public.soul_daily_prompts
    WHERE id = NEW.prompt_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger with the corrected function
DROP TRIGGER IF EXISTS populate_journal_prompt_trigger ON public.soul_journal_entries;
CREATE TRIGGER populate_journal_prompt_trigger
  BEFORE INSERT OR UPDATE ON public.soul_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION populate_journal_prompt();

COMMIT;
