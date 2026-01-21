-- Migration: Make all existing user cards public by default
-- This ensures cards show up in the public journal's CARD COLLECTION section

-- Update all existing cards to be public
UPDATE user_cards
SET is_public = true
WHERE is_public = false OR is_public IS NULL;

-- Verify the update
DO $$
DECLARE
  updated_count integer;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM user_cards WHERE is_public = true;
  RAISE NOTICE 'Total public cards after migration: %', updated_count;
END $$;
