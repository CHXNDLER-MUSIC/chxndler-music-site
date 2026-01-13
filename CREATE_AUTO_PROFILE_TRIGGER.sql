-- Auto-create profiles trigger for email confirmations
-- This will automatically create a profile when a user confirms their email
-- Supports both schema variants (name vs display_name, heart_coins vs heartcoin_balance)

-- First, create the function that will handle profile creation
CREATE OR REPLACE FUNCTION public.auto_create_profile_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
  v_has_name_column BOOLEAN;
  v_has_heart_coins_columns BOOLEAN;
BEGIN
  -- Only proceed if email_confirmed_at was just set (not updated)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Check if profile already exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN

      -- Determine display name
      v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Heartverse Wanderer'
      );

      -- Check which schema variant we have
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name'
      ) INTO v_has_name_column;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'heart_coins_current'
      ) INTO v_has_heart_coins_columns;

      -- Insert based on detected schema
      IF v_has_name_column AND v_has_heart_coins_columns THEN
        -- SUPABASE_SETUP.sql schema (name, heart_coins_current/total, metadata)
        INSERT INTO public.profiles (
          id, email, name, heart_coins_current, heart_coins_total,
          profile_complete, metadata, created_at, updated_at
        ) VALUES (
          NEW.id, NEW.email, v_display_name, 0, 0, false,
          jsonb_build_object('source', 'email_confirmation', 'timestamp', NOW()),
          NOW(), NOW()
        );
      ELSIF NOT v_has_name_column AND NOT v_has_heart_coins_columns THEN
        -- CREATE_PROFILES_TABLE.sql schema (display_name, heartcoin_balance)
        INSERT INTO public.profiles (
          id, email, display_name, heartcoin_balance, created_at, updated_at
        ) VALUES (
          NEW.id, NEW.email, v_display_name, 0, NOW(), NOW()
        );
      ELSE
        -- Mixed or unknown schema - try minimal insert
        INSERT INTO public.profiles (id, email, created_at, updated_at)
        VALUES (NEW.id, NEW.email, NOW(), NOW());
      END IF;

      RAISE LOG 'Auto-created profile for user % (%) with schema variant: name=%, heart_coins=%',
        NEW.id, NEW.email, v_has_name_column, v_has_heart_coins_columns;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth flow
    RAISE LOG 'Error auto-creating profile for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_create_profile_on_email_confirm ON auth.users;

-- Create the trigger for email confirmation
CREATE TRIGGER auto_create_profile_on_email_confirm
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_profile_on_confirm();