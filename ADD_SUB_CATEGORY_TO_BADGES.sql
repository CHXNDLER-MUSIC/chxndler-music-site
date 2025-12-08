-- Add sub_category field to badges table
-- Safe to run multiple times

begin;

-- Add sub_category column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'badges' 
    AND column_name = 'sub_category'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.badges ADD COLUMN sub_category text;
  END IF;
END $$;

-- Update elemental streak badges with proper sub_category values
UPDATE public.badges 
SET sub_category = 'HEART' 
WHERE category = 'elemental-streak' 
AND (badge_name ILIKE '%heart%' OR description ILIKE '%heart%');

UPDATE public.badges 
SET sub_category = 'WATER' 
WHERE category = 'elemental-streak' 
AND (badge_name ILIKE '%water%' OR description ILIKE '%water%');

UPDATE public.badges 
SET sub_category = 'LIGHTNING' 
WHERE category = 'elemental-streak' 
AND (badge_name ILIKE '%lightning%' OR description ILIKE '%lightning%');

UPDATE public.badges 
SET sub_category = 'DARKNESS' 
WHERE category = 'elemental-streak' 
AND (badge_name ILIKE '%darkness%' OR description ILIKE '%darkness%');

commit;