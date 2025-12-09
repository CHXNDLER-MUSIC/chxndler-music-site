-- Create triggers to award relics based on various user events
-- Safe to run multiple times

BEGIN;

-- Trigger 1: Award relic on first secret phrase redemption
CREATE OR REPLACE FUNCTION trg_award_relic_on_secret_redemption()
RETURNS TRIGGER AS $$
BEGIN
  -- Award "secret_keeper" relic on first secret phrase redemption
  PERFORM public.award_relic_to_user(NEW.user_id, 'secret_keeper');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the original operation
    RAISE LOG 'Error awarding secret_keeper relic to user %: %', NEW.user_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_award_relic_on_secret_redemption ON public.secret_phrase_redemptions;
CREATE TRIGGER trg_award_relic_on_secret_redemption
  AFTER INSERT ON public.secret_phrase_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION trg_award_relic_on_secret_redemption();

-- Trigger 2: Award relic on specific event types from events_v2
CREATE OR REPLACE FUNCTION trg_award_relic_on_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Award different relics based on event_name
  CASE NEW.event_name
    WHEN 'planet_click' THEN
      -- Check if it's a heart planet click from metadata
      IF NEW.metadata ? 'planet' AND NEW.metadata->>'planet' = 'heart' THEN
        PERFORM public.award_relic_to_user(NEW.user_id, 'planet_heart');
      END IF;
    
    WHEN 'first_support' THEN
      PERFORM public.award_relic_to_user(NEW.user_id, 'first_support');
    
    WHEN 'profile_created' THEN
      PERFORM public.award_relic_to_user(NEW.user_id, 'relic_1');
      
    WHEN 'first_heartcoin_earned' THEN
      PERFORM public.award_relic_to_user(NEW.user_id, 'relic_2');
      
    WHEN 'first_community_interaction' THEN
      PERFORM public.award_relic_to_user(NEW.user_id, 'relic_3');
      
    ELSE
      -- No relic for this event type
      NULL;
  END CASE;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the original operation
    RAISE LOG 'Error awarding relic for event % to user %: %', NEW.event_name, NEW.user_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_award_relic_on_event ON public.events_v2;
CREATE TRIGGER trg_award_relic_on_event
  AFTER INSERT ON public.events_v2
  FOR EACH ROW
  EXECUTE FUNCTION trg_award_relic_on_event();

-- Trigger 3: Award relics based on heartcoin milestones
CREATE OR REPLACE FUNCTION trg_award_relic_on_heartcoin_milestone()
RETURNS TRIGGER AS $$
DECLARE
  old_total integer;
  new_total integer;
BEGIN
  old_total := COALESCE(OLD.heartcoin_total, 0);
  new_total := COALESCE(NEW.heartcoin_total, 0);
  
  -- Award alien relics for heartcoin milestones
  IF old_total < 100 AND new_total >= 100 THEN
    PERFORM public.award_relic_to_user(NEW.id, 'alien_blue');
  END IF;
  
  IF old_total < 500 AND new_total >= 500 THEN
    PERFORM public.award_relic_to_user(NEW.id, 'alien_pink');
  END IF;
  
  -- Award pattern relics for higher milestones
  IF old_total < 1000 AND new_total >= 1000 THEN
    PERFORM public.award_relic_to_user(NEW.id, 'chxndler_pattern_2');
  END IF;
  
  IF old_total < 2500 AND new_total >= 2500 THEN
    PERFORM public.award_relic_to_user(NEW.id, 'chxndler_pattern_4');
  END IF;
  
  IF old_total < 5000 AND new_total >= 5000 THEN
    PERFORM public.award_relic_to_user(NEW.id, 'chxndler_pattern_6');
  END IF;
  
  IF old_total < 10000 AND new_total >= 10000 THEN
    PERFORM public.award_relic_to_user(NEW.id, 'chxndler_pattern_8');
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the original operation
    RAISE LOG 'Error awarding milestone relic to user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_award_relic_on_heartcoin_milestone ON public.profiles;
CREATE TRIGGER trg_award_relic_on_heartcoin_milestone
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.heartcoin_total IS DISTINCT FROM NEW.heartcoin_total)
  EXECUTE FUNCTION trg_award_relic_on_heartcoin_milestone();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION trg_award_relic_on_secret_redemption() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION trg_award_relic_on_event() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION trg_award_relic_on_heartcoin_milestone() TO authenticated, anon, service_role;

COMMIT;