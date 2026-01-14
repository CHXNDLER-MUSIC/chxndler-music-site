-- FIX: Update element check constraint to match current element values
-- Run this in Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_element_check;

-- Migrate any existing lowercase/old element values to the new capitalized format
UPDATE profiles SET element = 'Heart' WHERE element IN ('heart', 'fire');
UPDATE profiles SET element = 'Water' WHERE element = 'water';
UPDATE profiles SET element = 'Lightning' WHERE element IN ('lightning', 'air');
UPDATE profiles SET element = 'Darkness' WHERE element IN ('darkness', 'earth', 'space');

-- Add the new constraint with correct element values
-- These match what WhatElementAreYouModal.tsx sends (the label values)
ALTER TABLE profiles ADD CONSTRAINT profiles_element_check
  CHECK (element IS NULL OR element IN ('Heart', 'Lightning', 'Water', 'Darkness'));
