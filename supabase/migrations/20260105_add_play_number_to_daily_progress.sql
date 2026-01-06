-- Migration: Add play_number to user_song_daily_progress
-- Purpose: Allow multiple rows per user/song/day to track song repeats

-- Step 1: Add play_number column with default of 1 for existing rows
ALTER TABLE public.user_song_daily_progress
ADD COLUMN IF NOT EXISTS play_number INTEGER DEFAULT 1;

-- Step 2: Drop the existing unique constraint
ALTER TABLE public.user_song_daily_progress
DROP CONSTRAINT IF EXISTS user_song_daily_progress_user_id_song_id_day_key;

-- Step 3: Create new unique constraint including play_number
ALTER TABLE public.user_song_daily_progress
ADD CONSTRAINT user_song_daily_progress_user_song_day_play_key
UNIQUE (user_id, song_id, day, play_number);

-- Step 4: Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_song_daily_progress_user_song_day
ON public.user_song_daily_progress (user_id, song_id, day);

-- Step 5: Add started_at column to track when each play session started
ALTER TABLE public.user_song_daily_progress
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.user_song_daily_progress.play_number IS 'Sequential play count for each user/song/day (1, 2, 3...)';
COMMENT ON COLUMN public.user_song_daily_progress.started_at IS 'Timestamp when this play session started';
