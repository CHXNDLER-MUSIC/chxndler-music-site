-- RPC function to ensure a profile exists for the currently authenticated user
-- This is called from /auth/callback after session exchange
-- Runs as the authenticated user (no service role needed)

CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_display_name text;
  v_has_name_column boolean;
  v_has_heart_coins_columns boolean;
BEGIN
  -- Get the current user's ID and email from auth.users
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    -- Profile exists, nothing to do
    RETURN;
  END IF;

  -- Determine display name from user metadata or email
  SELECT COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1),
    'Heartverse Wanderer'
  ) INTO v_display_name
  FROM auth.users
  WHERE id = v_user_id;

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
      v_user_id, v_user_email, v_display_name, 0, 0, false,
      jsonb_build_object('source', 'ensure_profile_rpc', 'timestamp', NOW()),
      NOW(), NOW()
    );
  ELSIF NOT v_has_name_column AND NOT v_has_heart_coins_columns THEN
    -- CREATE_PROFILES_TABLE.sql schema (display_name, heartcoin_balance)
    INSERT INTO public.profiles (
      id, email, display_name, heartcoin_balance, created_at, updated_at
    ) VALUES (
      v_user_id, v_user_email, v_display_name, 0, NOW(), NOW()
    );
  ELSE
    -- Mixed or unknown schema - try minimal insert
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (v_user_id, v_user_email, NOW(), NOW());
  END IF;

  RAISE LOG 'ensure_profile: Created profile for user % (%)', v_user_id, v_user_email;

EXCEPTION
  WHEN unique_violation THEN
    -- Profile was created by another process (race condition), that's fine
    RAISE LOG 'ensure_profile: Profile already exists for user % (race condition)', v_user_id;
  WHEN OTHERS THEN
    RAISE LOG 'ensure_profile: Error creating profile for user %: %', v_user_id, SQLERRM;
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;
