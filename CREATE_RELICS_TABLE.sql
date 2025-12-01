-- Create relics table for collectible items system
-- Safe to run multiple times

BEGIN;

-- Create relics table
CREATE TABLE IF NOT EXISTS public.relics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relic_name text NOT NULL,
  icon_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.relics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read relics (public data)
GRANT SELECT ON TABLE public.relics TO authenticated;
GRANT SELECT ON TABLE public.relics TO anon;

-- Policy for reading relics (all users can read)
DROP POLICY IF EXISTS "Anyone can read relics" ON public.relics;
CREATE POLICY "Anyone can read relics"
  ON public.relics
  FOR SELECT
  USING (true);

-- Insert static relic data based on assets.ts RELIC_ICONS
INSERT INTO public.relics (relic_name, icon_url, description) VALUES
  ('CHXNDLER Pattern 2', '/relics/2_CHXNDLER-Pattern.webp', 'A mystical pattern relic displaying the sacred geometry of CHXNDLER''s cosmic design.'),
  ('CHXNDLER Pattern 4', '/relics/4_CHXNDLER-Pattern.webp', 'An intricate pattern relic revealing deeper layers of the CHXNDLER universe.'),
  ('CHXNDLER Pattern 6', '/relics/6_CHXNDLER-Pattern.webp', 'A complex pattern relic embodying the harmony of six elemental forces.'),
  ('CHXNDLER Pattern 8', '/relics/8_CHXNDLER-Pattern.webp', 'The most sophisticated pattern relic, representing infinite possibilities.'),
  ('Alien - Blue', '/relics/Alien - Blue (Transparent).webp', 'A crystalline blue alien artifact from the cosmic depths of space.'),
  ('Alien - Pink', '/relics/Alien - Pink (Transparent).webp', 'A radiant pink alien artifact pulsing with otherworldly energy.'),
  ('Relic 1', '/relics/1.webp', 'The first discovered relic, marking the beginning of your cosmic journey.'),
  ('Relic 2', '/relics/2.webp', 'The second ancient relic, deepening your connection to the universe.'),
  ('Relic 3', '/relics/3.webp', 'The third sacred relic, unlocking new levels of cosmic understanding.')
ON CONFLICT (relic_name) DO NOTHING;

-- Create user_relics table for tracking which relics users have earned
CREATE TABLE IF NOT EXISTS public.user_relics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  relic_id uuid NOT NULL REFERENCES public.relics (id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, relic_id)
);

-- Enable RLS for user_relics
ALTER TABLE public.user_relics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own relics
GRANT SELECT, INSERT, DELETE ON TABLE public.user_relics TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_relics TO anon;

-- Policies for user_relics
DROP POLICY IF EXISTS "Users can read their own relics" ON public.user_relics;
CREATE POLICY "Users can read their own relics"
  ON public.user_relics
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Anonymous users can read all relics" ON public.user_relics;
CREATE POLICY "Anonymous users can read all relics"
  ON public.user_relics
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own relics" ON public.user_relics;
CREATE POLICY "Users can insert their own relics"
  ON public.user_relics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Anonymous users can insert relics" ON public.user_relics;
CREATE POLICY "Anonymous users can insert relics"
  ON public.user_relics
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS user_relics_user_id_idx ON public.user_relics(user_id);
CREATE INDEX IF NOT EXISTS user_relics_relic_id_idx ON public.user_relics(relic_id);
CREATE INDEX IF NOT EXISTS user_relics_earned_at_idx ON public.user_relics(earned_at DESC);

COMMIT;