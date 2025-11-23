-- Add has_seen_tour column to profiles table
-- Safe to run multiple times

BEGIN;

-- Add the has_seen_tour column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_seen_tour boolean DEFAULT false;

-- Update existing profiles to have has_seen_tour = false if null
UPDATE public.profiles 
SET has_seen_tour = false 
WHERE has_seen_tour IS NULL;

COMMIT;