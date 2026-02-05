-- Migration: Add onboarding_reward_sequence_completed flag to profiles
-- This flag tracks whether a user has completed the first-time onboarding reward sequence
-- (HeartCoin celebration -> Wanderer badge celebration -> Tour prompt)
-- Once true, the sequence will never trigger again for this user.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_reward_sequence_completed BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_reward_sequence_completed IS
  'Tracks if user has completed the onboarding reward sequence (HeartCoin + Wanderer badge celebrations). Once true, sequence never triggers again.';
