-- Ensure badge schema has all necessary fields for progress tracking
-- Run this to fix any missing badge structure fields
-- Safe to run multiple times

BEGIN;

-- Add structured fields if they don't exist
ALTER TABLE public.badges 
  ADD COLUMN IF NOT EXISTS requirement_type text,
  ADD COLUMN IF NOT EXISTS requirement_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS slug text;

-- Create unique index on slug if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS badges_slug_idx ON public.badges(slug);

-- Update any badges that are missing structured data
UPDATE public.badges SET
  slug = CASE 
    WHEN slug IS NULL THEN lower(regexp_replace(regexp_replace(badge_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '_', 'g'))
    ELSE slug 
  END,
  requirement_type = CASE 
    WHEN requirement_type IS NULL THEN
      CASE 
        WHEN badge_name ILIKE '%soul%' THEN 'reflections'
        WHEN badge_name ILIKE '%coin%' OR badge_name ILIKE '%treasure%' OR badge_name ILIKE '%prosperity%' THEN 'heartcoins'
        WHEN badge_name IN ('Deep Listener', 'Music Explorer', 'First Listen') THEN 'listen'
        WHEN badge_name ILIKE '%music%' OR badge_name ILIKE '%song%' OR badge_name ILIKE '%melody%' THEN 'listening_time'
        WHEN badge_name ILIKE '%element%' THEN 'elemental_sessions'
        WHEN badge_name ILIKE '%community%' OR badge_name ILIKE '%friend%' OR badge_name ILIKE '%invite%' THEN 'community_interactions'
        WHEN badge_name ILIKE '%collector%' OR badge_name ILIKE '%archivist%' THEN 'digital_cards_owned'
        ELSE 'achievements'
      END
    ELSE requirement_type
  END,
  requirement_count = CASE 
    WHEN requirement_count IS NULL OR requirement_count = 0 THEN
      CASE 
        WHEN badge_name = 'Soul Star' THEN 1
        WHEN badge_name = 'Soul Ember' THEN 3  
        WHEN badge_name = 'Soul Flame' THEN 7
        WHEN badge_name = 'Soul Bloom' THEN 14
        WHEN badge_name = 'Soul Rise' THEN 30
        WHEN badge_name = 'Eternal Soul' THEN 100
        WHEN badge_name = 'First Coin' OR badge_name = 'First HeartCoin' THEN 1
        WHEN badge_name = 'Coin Collector' THEN 100
        WHEN badge_name = 'Treasure Keeper' OR badge_name = 'Heart Prosperity' THEN 1000
        WHEN badge_name = 'First Listen' THEN 1
        WHEN badge_name = 'Deep Listener' THEN 10
        WHEN badge_name = 'Music Explorer' THEN 25
        ELSE 1
      END
    ELSE requirement_count
  END,
  category = CASE 
    WHEN category IS NULL THEN
      CASE 
        WHEN badge_name ILIKE '%soul%' THEN 'soul'
        WHEN badge_name ILIKE '%coin%' OR badge_name ILIKE '%treasure%' OR badge_name ILIKE '%prosperity%' THEN 'currency'
        WHEN badge_name IN ('Deep Listener', 'Music Explorer', 'First Listen') OR badge_name ILIKE '%music%' OR badge_name ILIKE '%song%' OR badge_name ILIKE '%melody%' THEN 'listening'
        WHEN badge_name ILIKE '%element%' THEN 'elemental-streak'
        WHEN badge_name ILIKE '%community%' OR badge_name ILIKE '%friend%' OR badge_name ILIKE '%invite%' THEN 'community'
        WHEN badge_name ILIKE '%collector%' OR badge_name ILIKE '%archivist%' THEN 'collector'
        ELSE 'collector'
      END
    ELSE category
  END
WHERE requirement_type IS NULL OR requirement_count IS NULL OR requirement_count = 0 OR category IS NULL OR slug IS NULL;

-- Verify the fix worked
SELECT 
  badge_name,
  requirement_type,
  requirement_count,
  category,
  slug
FROM public.badges 
WHERE requirement_type IS NOT NULL 
ORDER BY category, badge_name;

COMMIT;