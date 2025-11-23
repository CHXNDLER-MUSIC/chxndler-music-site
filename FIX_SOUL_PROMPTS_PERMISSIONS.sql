-- Fix soul_daily_prompts RLS policies to allow proper access
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "service_role_can_manage_daily_prompts" ON public.soul_daily_prompts;

-- Allow service role to manage daily prompts (for the admin function)
CREATE POLICY "service_role_can_manage_daily_prompts"
  ON public.soul_daily_prompts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert daily prompts (fallback for API routes)
CREATE POLICY "authenticated_can_insert_daily_prompts"
  ON public.soul_daily_prompts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anonymous users to insert daily prompts (fallback for server functions)
CREATE POLICY "anon_can_insert_daily_prompts"
  ON public.soul_daily_prompts FOR INSERT
  TO anon
  WITH CHECK (true);

-- The existing read policy allows everyone to select, which is good
-- CREATE POLICY "allow_soul_daily_prompts_select_all"
--   ON public.soul_daily_prompts FOR SELECT
--   USING (true);