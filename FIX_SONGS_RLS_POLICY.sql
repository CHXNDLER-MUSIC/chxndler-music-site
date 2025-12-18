-- Fix RLS policy on songs table to allow reading ALL songs
-- Unreleased songs will be shown as grey planets in the UI

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Allow public read access to released songs" ON public.songs;
DROP POLICY IF EXISTS "Allow read access to released songs" ON public.songs;
DROP POLICY IF EXISTS "songs_select_policy" ON public.songs;

-- Create new policy that allows reading ALL songs (released and unreleased)
-- The UI will handle displaying unreleased songs differently (grey planets)
CREATE POLICY "Allow public read access to all songs"
ON public.songs
FOR SELECT
TO public
USING (true);

-- Verify RLS is enabled
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- Grant select permission to anon and authenticated roles
GRANT SELECT ON public.songs TO anon;
GRANT SELECT ON public.songs TO authenticated;
