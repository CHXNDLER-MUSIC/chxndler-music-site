-- Migration: Make all existing user cards public by default
-- This ensures cards show up in the public journal's CARD COLLECTION section

-- Step 1: Add is_public column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_cards' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE user_cards ADD COLUMN is_public BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added is_public column to user_cards table';
  ELSE
    RAISE NOTICE 'is_public column already exists';
  END IF;
END $$;

-- Step 2: Update all existing cards to be public (for any that were null or false)
UPDATE user_cards
SET is_public = true
WHERE is_public = false OR is_public IS NULL;

-- Step 3: Verify the update
DO $$
DECLARE
  updated_count integer;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM user_cards WHERE is_public = true;
  RAISE NOTICE 'Total public cards after migration: %', updated_count;
END $$;
