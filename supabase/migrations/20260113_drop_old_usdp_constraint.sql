-- Migration: Drop the old unique constraint that blocks multiple play sessions
-- The old constraint uq_usdp_user_song_day only covers (user_id, song_id, day)
-- but we need (user_id, song_id, day, play_number) to allow multiple plays per day

-- Drop the old constraint (may have different names depending on when it was created)
ALTER TABLE public.user_song_daily_progress
DROP CONSTRAINT IF EXISTS uq_usdp_user_song_day;

ALTER TABLE public.user_song_daily_progress
DROP CONSTRAINT IF EXISTS user_song_daily_progress_user_id_song_id_day_key;

-- Ensure the correct constraint exists (with play_number)
-- This is idempotent - it won't fail if the constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_song_daily_progress_user_song_day_play_key'
    ) THEN
        ALTER TABLE public.user_song_daily_progress
        ADD CONSTRAINT user_song_daily_progress_user_song_day_play_key
        UNIQUE (user_id, song_id, day, play_number);
    END IF;
END $$;
