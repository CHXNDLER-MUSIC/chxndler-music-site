-- Fix RLS policies to allow viewing public journal entries
-- The current policy only allows users to view their own entries
-- We need to add a policy that allows viewing entries where is_public = true

BEGIN;

-- Drop the restrictive select policy
DROP POLICY IF EXISTS "users_can_view_own_journal_entries" ON public.soul_journal_entries;

-- Create a new policy that allows:
-- 1. Users to view their own entries (public or private)
-- 2. Anyone (authenticated) to view public entries from other users
CREATE POLICY "users_can_view_journal_entries"
  ON public.soul_journal_entries FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id  -- User can always see their own entries
    OR is_public = true   -- Anyone can see public entries
  );

-- Also allow anonymous users to view public entries (for logged-out visitors)
DROP POLICY IF EXISTS "anon_can_view_public_journal_entries" ON public.soul_journal_entries;
CREATE POLICY "anon_can_view_public_journal_entries"
  ON public.soul_journal_entries FOR SELECT
  TO anon
  USING (is_public = true);

-- Grant SELECT permission to anon role on soul_journal_entries
GRANT SELECT ON public.soul_journal_entries TO anon;

-- Also need to ensure profiles table is accessible for the join
-- (profiles should already have public read access, but ensure it)
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;

COMMIT;
