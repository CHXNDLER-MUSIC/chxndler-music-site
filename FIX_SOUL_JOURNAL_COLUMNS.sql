-- Add missing columns to soul_journal_entries table
-- This script adds the columns that the ProfileContext code expects

BEGIN;

-- Add the missing columns if they don't exist
ALTER TABLE public.soul_journal_entries 
ADD COLUMN IF NOT EXISTS prompt_id uuid REFERENCES soul_daily_prompts(id),
ADD COLUMN IF NOT EXISTS intention_response text,
ADD COLUMN IF NOT EXISTS reflection_response text,
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- Update the unique constraint to include element as expected by the code
ALTER TABLE public.soul_journal_entries 
DROP CONSTRAINT IF EXISTS soul_journal_entries_user_id_entry_date_key;

ALTER TABLE public.soul_journal_entries 
ADD CONSTRAINT soul_journal_entries_user_id_entry_date_element_key 
UNIQUE (user_id, entry_date, element);

COMMIT;