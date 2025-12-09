-- Sync existing badges from public.badges to public.badge_definitions
-- This script maps badge requirements to structured data
-- Safe to run multiple times (uses ON CONFLICT)

begin;

-- Insert badges from the badges table into badge_definitions with parsed requirements
INSERT INTO public.badge_definitions (slug, title, description, requirement_type, requirement_count, icon, category)
SELECT 
  -- Create slug from badge_name (lowercase, replace spaces with underscores, remove special chars)
  lower(regexp_replace(regexp_replace(badge_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '_', 'g')) as slug,
  badge_name as title,
  description,
  -- Parse requirement_type from badge characteristics
  CASE 
    -- Soul/reflection badges
    WHEN badge_name ILIKE '%soul%' THEN 'reflections'
    -- HeartCoin badges  
    WHEN badge_name ILIKE '%coin%' OR badge_name ILIKE '%treasure%' THEN 'heartcoins'
    -- Listening badges
    WHEN badge_name ILIKE '%music%' OR badge_name ILIKE '%song%' OR badge_name ILIKE '%melody%' THEN 'listening_time'
    -- Elemental badges
    WHEN badge_name ILIKE '%element%' OR badge_name IN ('Heart Element', 'Water Element', 'Lightning Element', 'Darkness Element') THEN 'elemental_sessions'
    -- Community badges
    WHEN badge_name ILIKE '%community%' OR badge_name ILIKE '%friend%' THEN 'community_interactions'
    -- Collector/achievement badges
    WHEN badge_name ILIKE '%collector%' OR badge_name ILIKE '%first%' OR badge_name ILIKE '%witness%' OR badge_name ILIKE '%supporter%' THEN 'achievements'
    -- Default fallback
    ELSE 'achievements'
  END as requirement_type,
  -- Parse requirement_count from badge name and description
  CASE 
    -- Soul badges with specific counts
    WHEN badge_name = 'Soul Star' THEN 1
    WHEN badge_name = 'Soul Ember' THEN 3  
    WHEN badge_name = 'Soul Flame' THEN 7
    WHEN badge_name = 'Soul Bloom' THEN 14
    WHEN badge_name = 'Soul Rise' THEN 30
    -- HeartCoin badges
    WHEN badge_name = 'First Coin' THEN 1
    WHEN badge_name = 'Coin Collector' THEN 100
    WHEN badge_name = 'Treasure Keeper' THEN 1000
    -- Listening badges  
    WHEN badge_name = 'Music Explorer' THEN 10
    WHEN badge_name = 'Song Keeper' THEN 60 -- 1 hour in minutes
    WHEN badge_name = 'Melody Master' THEN 600 -- 10 hours in minutes
    -- Collector badges
    WHEN badge_name = 'Collector' THEN 5
    WHEN badge_name = 'Witness' THEN 7
    -- Community badges
    WHEN badge_name = 'Friend Maker' THEN 5
    WHEN badge_name = 'Community Leader' THEN 3
    -- All other badges default to 1
    ELSE 1
  END as requirement_count,
  icon_url as icon,
  category
FROM public.badges
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  requirement_type = EXCLUDED.requirement_type,
  requirement_count = EXCLUDED.requirement_count,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  updated_at = now();

commit;