-- Add counter columns to profiles table for badge progress tracking
-- Safe to run multiple times

begin;

-- Add counter columns for various user activities
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_reflections integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_listening_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_heartcoins_earned integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS elemental_sessions_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS community_interactions integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements_unlocked integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streams_attended integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS concerts_attended integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cards_owned integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS merch_items_owned integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unique_merch_items integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS digital_cards_owned integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS donations_made integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heartcoins_sent integer NOT NULL DEFAULT 0;

-- Add indexes for performance on commonly queried counter columns
CREATE INDEX IF NOT EXISTS idx_profiles_total_reflections ON public.profiles(total_reflections);
CREATE INDEX IF NOT EXISTS idx_profiles_total_heartcoins_earned ON public.profiles(total_heartcoins_earned);
CREATE INDEX IF NOT EXISTS idx_profiles_cards_owned ON public.profiles(cards_owned);
CREATE INDEX IF NOT EXISTS idx_profiles_unique_merch_items ON public.profiles(unique_merch_items);
CREATE INDEX IF NOT EXISTS idx_profiles_digital_cards_owned ON public.profiles(digital_cards_owned);

-- Update existing profiles to have realistic counter values based on existing data
-- This is a one-time data migration to populate counters

-- Update cards_owned counter from user_cards
UPDATE public.profiles
SET cards_owned = COALESCE((
  SELECT COUNT(*)
  FROM public.user_cards
  WHERE user_cards.user_id = profiles.id
), 0)
WHERE cards_owned = 0;

-- Update digital_cards_owned counter from user_cards where is_digital = true
UPDATE public.profiles
SET digital_cards_owned = COALESCE((
  SELECT COUNT(*)
  FROM public.user_cards
  WHERE user_cards.user_id = profiles.id
    AND user_cards.is_digital = true
), 0)
WHERE digital_cards_owned = 0;

-- Update achievements_unlocked from user_badges  
UPDATE public.profiles
SET achievements_unlocked = COALESCE((
  SELECT COUNT(*)
  FROM public.user_badges
  WHERE user_badges.user_id = profiles.id
), 0)
WHERE achievements_unlocked = 0;

-- Update total_heartcoins_earned to match current heartcoin_balance
-- (assuming balance reflects total earned for now)
UPDATE public.profiles
SET total_heartcoins_earned = heartcoin_balance
WHERE total_heartcoins_earned = 0 AND heartcoin_balance > 0;

commit;