-- Comprehensive relic system fixes and setup
-- This migration addresses all issues identified in the schema inspection

BEGIN;

-- Step 1: Fix the relics table to match the expected schema
-- The current table has relic_name, icon_url but needs code, label, kind, rarity, image_url
DROP TABLE IF EXISTS public.relics CASCADE;
DROP TABLE IF EXISTS public.user_relics CASCADE;

-- Create relics table with correct schema
CREATE TABLE public.relics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  kind text, 
  rarity text,
  image_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_relics table with proper structure
CREATE TABLE public.user_relics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relic_id uuid NOT NULL REFERENCES public.relics(id) ON DELETE CASCADE,
  obtained_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, relic_id)
);

-- Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heartcoin_total integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS relics_unlocked_count integer NOT NULL DEFAULT 0;

-- Enable RLS on both tables
ALTER TABLE public.relics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_relics ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON TABLE public.relics TO authenticated, anon;
GRANT SELECT, INSERT ON TABLE public.user_relics TO authenticated, anon;

-- Policies for relics (public read)
DROP POLICY IF EXISTS "Anyone can read relics" ON public.relics;
CREATE POLICY "Anyone can read relics"
  ON public.relics
  FOR SELECT
  USING (true);

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

DROP POLICY IF EXISTS "Service role can manage relics" ON public.user_relics;
CREATE POLICY "Service role can manage relics"
  ON public.user_relics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX user_relics_user_id_idx ON public.user_relics(user_id);
CREATE INDEX user_relics_relic_id_idx ON public.user_relics(relic_id);
CREATE INDEX user_relics_obtained_at_idx ON public.user_relics(obtained_at DESC);

-- Seed relics based on the original data but with correct schema
INSERT INTO public.relics (code, label, kind, rarity, image_url, description) VALUES
  ('chxndler_pattern_2', 'CHXNDLER Pattern 2', 'pattern', 'common', '/relics/2_CHXNDLER-Pattern.webp', 'A mystical pattern relic displaying the sacred geometry of CHXNDLER''s cosmic design.'),
  ('chxndler_pattern_4', 'CHXNDLER Pattern 4', 'pattern', 'uncommon', '/relics/4_CHXNDLER-Pattern.webp', 'An intricate pattern relic revealing deeper layers of the CHXNDLER universe.'),
  ('chxndler_pattern_6', 'CHXNDLER Pattern 6', 'pattern', 'rare', '/relics/6_CHXNDLER-Pattern.webp', 'A complex pattern relic embodying the harmony of six elemental forces.'),
  ('chxndler_pattern_8', 'CHXNDLER Pattern 8', 'pattern', 'epic', '/relics/8_CHXNDLER-Pattern.webp', 'The most sophisticated pattern relic, representing infinite possibilities.'),
  ('alien_blue', 'Alien - Blue', 'alien', 'rare', '/relics/Alien - Blue (Transparent).webp', 'A crystalline blue alien artifact from the cosmic depths of space.'),
  ('alien_pink', 'Alien - Pink', 'alien', 'rare', '/relics/Alien - Pink (Transparent).webp', 'A radiant pink alien artifact pulsing with otherworldly energy.'),
  ('relic_1', 'First Discovery', 'discovery', 'common', '/relics/1.webp', 'The first discovered relic, marking the beginning of your cosmic journey.'),
  ('relic_2', 'Cosmic Connection', 'discovery', 'common', '/relics/2.webp', 'The second ancient relic, deepening your connection to the universe.'),
  ('relic_3', 'Sacred Understanding', 'discovery', 'common', '/relics/3.webp', 'The third sacred relic, unlocking new levels of cosmic understanding.'),
  ('planet_heart', 'Planet Heart', 'achievement', 'uncommon', '/relics/planet_heart.webp', 'Awarded for exploring the heart planet in the Heartverse.'),
  ('first_support', 'First Support', 'achievement', 'common', '/relics/first_support.webp', 'Awarded for your first act of support in the community.'),
  ('secret_keeper', 'Secret Keeper', 'achievement', 'rare', '/relics/secret_keeper.webp', 'Awarded for discovering and redeeming a secret phrase.')
ON CONFLICT (code) DO NOTHING;

-- Step 2: Create the award_relic_to_user function
CREATE OR REPLACE FUNCTION public.award_relic_to_user(
  p_user_id uuid,
  p_relic_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_relic_id uuid;
  v_already_owned boolean;
BEGIN
  -- Get the relic ID for the given code
  SELECT id INTO v_relic_id
  FROM public.relics
  WHERE code = p_relic_code;

  -- Raise exception if relic doesn't exist
  IF v_relic_id IS NULL THEN
    RAISE EXCEPTION 'Relic with code % not found', p_relic_code;
  END IF;

  -- Check if user already owns this relic
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_relics 
    WHERE user_id = p_user_id AND relic_id = v_relic_id
  ) INTO v_already_owned;

  -- Only proceed if user doesn't already own the relic
  IF NOT v_already_owned THEN
    -- Award the relic
    INSERT INTO public.user_relics (user_id, relic_id)
    VALUES (p_user_id, v_relic_id);

    -- Update the relics count in profiles
    UPDATE public.profiles
    SET relics_unlocked_count = relics_unlocked_count + 1
    WHERE id = p_user_id;

    RAISE LOG 'Awarded relic % to user %', p_relic_code, p_user_id;
  ELSE
    RAISE LOG 'User % already owns relic %', p_user_id, p_relic_code;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error awarding relic % to user %: %', p_relic_code, p_user_id, SQLERRM;
    RAISE;
END;
$$;

-- Grant execute permission to the function
GRANT EXECUTE ON FUNCTION public.award_relic_to_user(uuid, text) TO authenticated, anon, service_role;

COMMIT;