-- Auto-create profiles trigger for email confirmations
-- This will automatically create a profile when a user confirms their email

-- First, create the function that will handle profile creation
CREATE OR REPLACE FUNCTION public.auto_create_profile_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only proceed if email_confirmed_at was just set (not updated)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Check if profile already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
      INSERT INTO public.profiles (
        id,
        email,
        name,
        heart_coins_current,
        heart_coins_total,
        profile_complete,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Heartverse Wanderer'),
        0, -- Welcome bonus heart coins
        0, -- Total heart coins
        false,
        jsonb_build_object(
          'source', 'welcome_home_modal',
          'timestamp', NOW(),
          'created_from', 'email_confirmation_trigger'
        ),
        NOW(),
        NOW()
      );
      
      RAISE LOG 'Auto-created profile for user % (%)', NEW.id, NEW.email;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth flow
    RAISE LOG 'Error auto-creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_create_profile_on_email_confirm ON auth.users;

-- Create the trigger for email confirmation
CREATE TRIGGER auto_create_profile_on_email_confirm
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_profile_on_confirm();