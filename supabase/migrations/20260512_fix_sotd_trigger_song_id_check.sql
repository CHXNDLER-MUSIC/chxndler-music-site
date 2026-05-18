-- Fix: Song of the Day trigger must verify the completed song matches today's SOTD.
-- Previously the trigger fired for ANY song marked completed=true, awarding the
-- SOTD HeartCoin even when a different song was being listened to.

-- Replace the SOTD award function to add the song_id guard.
-- This is idempotent — safe to run even if the function didn't exist before.
CREATE OR REPLACE FUNCTION public.award_sotd_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  sotd_song_id UUID;
BEGIN
  -- Only proceed when completed transitions to true
  IF NEW.completed IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Skip if it was already true (UPDATE where completed was already true)
  IF TG_OP = 'UPDATE' AND OLD.completed IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Look up today's Song of the Day song_id
  SELECT e.song_id INTO sotd_song_id
  FROM public.element_of_day e
  WHERE e.day = NEW.day
  LIMIT 1;

  -- Guard: only award when the completed song IS today's SOTD
  IF sotd_song_id IS NULL OR NEW.song_id != sotd_song_id THEN
    RETURN NEW;
  END IF;

  -- Idempotent claim insert — duplicate is silently ignored
  INSERT INTO public.user_song_of_day_claims (user_id, day, song_id, claimed_at)
  VALUES (NEW.user_id, NEW.day, NEW.song_id, NOW())
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop any existing trigger with the common name variants, then recreate correctly.
DROP TRIGGER IF EXISTS sotd_award_on_completion       ON public.user_song_daily_progress;
DROP TRIGGER IF EXISTS award_sotd_on_completion       ON public.user_song_daily_progress;
DROP TRIGGER IF EXISTS trg_award_sotd_on_completion   ON public.user_song_daily_progress;
DROP TRIGGER IF EXISTS on_song_completed_award_sotd   ON public.user_song_daily_progress;

CREATE TRIGGER sotd_award_on_completion
  AFTER INSERT OR UPDATE OF completed
  ON public.user_song_daily_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.award_sotd_on_completion();

COMMENT ON FUNCTION public.award_sotd_on_completion() IS
  'Awards SOTD HeartCoin only when the song that reached completed=true matches element_of_day.song_id for that day.';
