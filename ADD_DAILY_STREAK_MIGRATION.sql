-- Add daily_streak columns to profiles table
-- Safe to run multiple times

BEGIN;

-- Add the daily_streak column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_streak integer DEFAULT 0;

-- Add streak_last_updated column to track when the streak was last updated
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS streak_last_updated date;

-- Update existing profiles to have daily_streak = 0 if null
UPDATE public.profiles 
SET daily_streak = 0 
WHERE daily_streak IS NULL;

-- Set streak_last_updated to current date for existing users with no streaks
UPDATE public.profiles 
SET streak_last_updated = CURRENT_DATE 
WHERE streak_last_updated IS NULL AND daily_streak = 0;

COMMIT;