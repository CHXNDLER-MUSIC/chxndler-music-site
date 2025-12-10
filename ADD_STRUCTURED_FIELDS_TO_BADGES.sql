-- Add structured fields to existing badges table
-- Safe to run multiple times

begin;

-- Add new columns to badges table if they don't exist
ALTER TABLE public.badges 
  ADD COLUMN IF NOT EXISTS requirement_type text,
  ADD COLUMN IF NOT EXISTS requirement_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS slug text;

-- Create unique index on slug if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS badges_slug_idx ON public.badges(slug);

-- Update existing badges with structured data
UPDATE public.badges SET
  slug = lower(regexp_replace(regexp_replace(badge_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '_', 'g')),
  requirement_type = CASE 
    -- Soul/reflection badges
    WHEN badge_name ILIKE '%soul%' THEN 'reflections'
    -- HeartCoin badges  
    WHEN badge_name ILIKE '%coin%' OR badge_name ILIKE '%treasure%' OR badge_name ILIKE '%prosperity%' THEN 'heartcoins'
    -- Listening badges - specific track-based badges
    WHEN badge_name IN ('Deep Listener', 'Music Explorer', 'First Listen') THEN 'listen'
    -- Listening badges - time-based
    WHEN badge_name ILIKE '%music%' OR badge_name ILIKE '%song%' OR badge_name ILIKE '%melody%' THEN 'listening_time'
    -- Elemental badges
    WHEN badge_name ILIKE '%element%' OR badge_name IN ('Heart Element', 'Water Element', 'Lightning Element', 'Fire Element', 'Darkness Element') THEN 'elemental_sessions'
    -- Community badges
    WHEN badge_name ILIKE '%community%' OR badge_name ILIKE '%friend%' OR badge_name ILIKE '%invite%' OR badge_name ILIKE '%portal%' OR badge_name ILIKE '%ambassador%' THEN 'community_interactions'
    -- Collector/achievement badges
    WHEN badge_name ILIKE '%collector%' OR badge_name ILIKE '%archivist%' OR badge_name ILIKE '%memory%' OR badge_name ILIKE '%witness%' OR badge_name ILIKE '%supporter%' THEN 'digital_cards_owned'
    -- Default fallback
    ELSE 'achievements'
  END,
  requirement_count = CASE 
    -- Soul badges with specific counts
    WHEN badge_name = 'Soul Star' THEN 1
    WHEN badge_name = 'Soul Ember' THEN 3  
    WHEN badge_name = 'Soul Flame' THEN 7
    WHEN badge_name = 'Soul Bloom' THEN 14
    WHEN badge_name = 'Soul Rise' THEN 30
    -- HeartCoin badges
    WHEN badge_name = 'First Coin' OR badge_name = 'First HeartCoin' THEN 1
    WHEN badge_name = 'Coin Collector' THEN 100
    WHEN badge_name = 'Treasure Keeper' OR badge_name = 'Heart Prosperity' THEN 1000
    -- Listening badges - extracted from requirement text  
    WHEN badge_name = 'First Listen' THEN 1
    WHEN badge_name = 'Deep Listener' THEN 10 -- Listen to 10 unique tracks
    WHEN badge_name = 'Music Explorer' THEN 25 -- Listen to 25 unique tracks
    WHEN badge_name = 'Song Keeper' THEN 60 -- 1 hour in minutes
    WHEN badge_name = 'Melody Master' THEN 600 -- 10 hours in minutes
    -- Collector badges
    WHEN badge_name = 'Collector' THEN 1 -- Collect 1 digital card
    WHEN badge_name = 'Digital Archivist' THEN 5 -- Collect 5 digital cards
    WHEN badge_name = 'Memory Keeper' THEN 10 -- Collect 10 digital cards
    WHEN badge_name = 'Witness' THEN 7
    -- Community badges
    WHEN badge_name = 'Community Builder' THEN 1 -- Invite 1 friend  
    WHEN badge_name = 'Portal Opener' THEN 3 -- Invite 3 friends
    WHEN badge_name = 'Heartverse Ambassador' THEN 10 -- Invite 10 friends
    WHEN badge_name = 'Friend Maker' THEN 5
    WHEN badge_name = 'Community Leader' THEN 3
    -- All other badges default to 1
    ELSE 1
  END,
  category = CASE 
    -- Soul/reflection badges
    WHEN badge_name ILIKE '%soul%' THEN 'soul'
    -- HeartCoin badges  
    WHEN badge_name ILIKE '%coin%' OR badge_name ILIKE '%treasure%' OR badge_name ILIKE '%prosperity%' THEN 'currency'
    -- Listening badges
    WHEN badge_name IN ('Deep Listener', 'Music Explorer', 'First Listen') OR badge_name ILIKE '%music%' OR badge_name ILIKE '%song%' OR badge_name ILIKE '%melody%' THEN 'listening'
    -- Elemental badges
    WHEN badge_name ILIKE '%element%' OR badge_name IN ('Heart Element', 'Water Element', 'Lightning Element', 'Fire Element', 'Darkness Element') THEN 'elemental-streak'
    -- Community badges
    WHEN badge_name ILIKE '%community%' OR badge_name ILIKE '%friend%' OR badge_name ILIKE '%invite%' OR badge_name ILIKE '%portal%' OR badge_name ILIKE '%ambassador%' THEN 'community'
    -- Collector/achievement badges
    WHEN badge_name ILIKE '%collector%' OR badge_name ILIKE '%archivist%' OR badge_name ILIKE '%memory%' OR badge_name ILIKE '%witness%' OR badge_name ILIKE '%supporter%' THEN 'collector'
    -- Default fallback
    ELSE 'collector'
  END
WHERE requirement_type IS NULL OR category IS NULL OR slug IS NULL;

commit;