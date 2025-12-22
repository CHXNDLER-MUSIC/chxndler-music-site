-- Fix user_cards table RLS policies to allow public card viewing
-- This migration enables anon users to view cards that are marked as public
-- Safe to run multiple times

BEGIN;

-- 1. Add is_public column if it doesn't exist
-- This column determines whether a card is publicly visible in a user's binder
ALTER TABLE public.user_cards
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- 2. Create index for efficient public cards queries
CREATE INDEX IF NOT EXISTS user_cards_is_public_idx
  ON public.user_cards (is_public);

-- Create partial index for public cards (more efficient for public queries)
CREATE INDEX IF NOT EXISTS user_cards_public_user_idx
  ON public.user_cards (user_id, acquired_at)
  WHERE is_public = true;

-- 3. Grant SELECT permission to anon role (required for RLS to allow access)
GRANT SELECT ON public.user_cards TO anon;

-- 4. Drop existing public access policy if it exists
DROP POLICY IF EXISTS "Allow public read access to public cards" ON public.user_cards;

-- 5. Create RLS policy for public card viewing
-- This allows anyone (anon or authenticated) to view cards marked as public
CREATE POLICY "Allow public read access to public cards"
  ON public.user_cards
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- 6. Also ensure the cards table (referenced by user_cards) is accessible
-- This prevents "permission denied for table cards" errors on the join
GRANT SELECT ON public.cards TO anon;

-- 7. Ensure profiles table is accessible for any FK checks (defensive)
-- Note: This should already exist but we add it defensively
GRANT SELECT ON public.profiles TO anon;

COMMIT;
