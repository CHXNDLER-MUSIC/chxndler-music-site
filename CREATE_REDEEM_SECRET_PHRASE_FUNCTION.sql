-- Create the redeem_secret_phrase RPC function
-- This function validates and redeems secret phrases for heart coins

CREATE OR REPLACE FUNCTION public.redeem_secret_phrase(p_phrase text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_phrase_id uuid;
  v_reward integer;
  v_phrase_code text;
  v_already_redeemed boolean;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();

  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'status', 'not_authenticated',
      'awarded', 0
    );
  END IF;

  -- Normalize the phrase (lowercase, trim)
  v_phrase_code := lower(trim(p_phrase));

  -- Find active secret phrase
  SELECT id, reward_heart_coins
  INTO v_phrase_id, v_reward
  FROM public.secret_phrases
  WHERE lower(code) = v_phrase_code
    AND now() >= start_at
    AND now() <= end_at
  LIMIT 1;

  -- Check if phrase exists and is active
  IF v_phrase_id IS NULL THEN
    RETURN json_build_object(
      'status', 'invalid',
      'awarded', 0
    );
  END IF;

  -- Check if user already redeemed this phrase
  SELECT EXISTS (
    SELECT 1 FROM public.secret_phrase_redemptions
    WHERE user_id = v_user_id
      AND secret_phrase_id = v_phrase_id
  ) INTO v_already_redeemed;

  IF v_already_redeemed THEN
    RETURN json_build_object(
      'status', 'already_redeemed',
      'awarded', 0
    );
  END IF;

  -- Insert the redemption record
  INSERT INTO public.secret_phrase_redemptions (
    user_id,
    secret_phrase_id,
    heart_coins_awarded,
    redeemed_at
  ) VALUES (
    v_user_id,
    v_phrase_id,
    v_reward,
    now()
  );

  -- Award heart coins to user's profile
  UPDATE public.profiles
  SET
    heart_coins_current = COALESCE(heart_coins_current, 0) + v_reward,
    heart_coins_total = COALESCE(heart_coins_total, 0) + v_reward
  WHERE id = v_user_id;

  -- Return success
  RETURN json_build_object(
    'status', 'success',
    'awarded', v_reward
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: user already redeemed
    RETURN json_build_object(
      'status', 'already_redeemed',
      'awarded', 0
    );
  WHEN OTHERS THEN
    -- Log error and return generic error
    RAISE WARNING 'redeem_secret_phrase error: %', SQLERRM;
    RETURN json_build_object(
      'status', 'error',
      'awarded', 0
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.redeem_secret_phrase(text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.redeem_secret_phrase(text) IS 'Redeems a secret phrase for heart coins. Returns JSON with status and awarded amount.';
