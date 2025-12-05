-- Ensure soul_daily_prompt table has the correct structure for auto-population
-- This ensures the table exists with the right columns for the journal auto-population

BEGIN;

-- Ensure the soul_daily_prompt table exists (it should already exist based on other migrations)
-- This is just to make sure it has all required columns
CREATE TABLE IF NOT EXISTS public.soul_daily_prompt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_date date NOT NULL UNIQUE,
  element text NOT NULL CHECK (element IN ('heart', 'water', 'lightning', 'darkness')),
  intention text NOT NULL,
  prompt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if they don't exist
ALTER TABLE public.soul_daily_prompt 
ADD COLUMN IF NOT EXISTS intention text;

ALTER TABLE public.soul_daily_prompt 
ADD COLUMN IF NOT EXISTS prompt text;

-- Ensure unique constraint on (prompt_date, element) if that's the pattern
-- (This allows multiple elements per day if needed)
ALTER TABLE public.soul_daily_prompt 
DROP CONSTRAINT IF EXISTS soul_daily_prompt_prompt_date_key;

ALTER TABLE public.soul_daily_prompt 
ADD CONSTRAINT IF NOT EXISTS soul_daily_prompt_date_element_unique
UNIQUE (prompt_date, element);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS soul_daily_prompt_date_element_idx 
  ON public.soul_daily_prompt (prompt_date, element);

-- Enable RLS if not already enabled
ALTER TABLE public.soul_daily_prompt ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read daily prompts (they're public)
DROP POLICY IF EXISTS "allow_soul_daily_prompt_select_all" ON public.soul_daily_prompt;
CREATE POLICY "allow_soul_daily_prompt_select_all"
  ON public.soul_daily_prompt FOR SELECT
  USING (true);

-- Only service role can insert/update daily prompts
DROP POLICY IF EXISTS "service_role_can_manage_daily_prompt" ON public.soul_daily_prompt;
CREATE POLICY "service_role_can_manage_daily_prompt"
  ON public.soul_daily_prompt FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;