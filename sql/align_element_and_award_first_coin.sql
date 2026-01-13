-- RPC function to align element and award first HeartCoin (idempotent)
-- Called when user completes onboarding by selecting their element
-- Returns: { success: boolean, awarded: boolean, element: string, heartcoin_balance: number }

CREATE OR REPLACE FUNCTION public.align_element_and_award_first_coin(
  p_name TEXT,
  p_element TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_balance INTEGER;
  v_awarded BOOLEAN := FALSE;
  v_profile_complete BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated',
      'awarded', false
    );
  END IF;

  -- Get current profile state
  SELECT profile_complete, heartcoin_balance
  INTO v_profile_complete, v_current_balance
  FROM profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found',
      'awarded', false
    );
  END IF;

  -- Update profile with name, element, and mark as complete
  UPDATE profiles
  SET
    name = p_name,
    element = p_element,
    profile_complete = true,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Only award HeartCoin if profile was not already complete
  -- This makes the function idempotent - can be called multiple times safely
  IF v_profile_complete IS DISTINCT FROM true THEN
    -- Award 1 HeartCoin for first-time profile completion
    UPDATE profiles
    SET
      heartcoin_balance = COALESCE(heartcoin_balance, 0) + 1,
      heartcoin_total = COALESCE(heartcoin_total, 0) + 1
    WHERE id = v_user_id;

    -- Log the transaction
    INSERT INTO heartcoin_transactions (
      user_id,
      amount,
      reason,
      description,
      transaction_type
    ) VALUES (
      v_user_id,
      1,
      'profile_completion',
      'Welcome to the Heartverse! First HeartCoin earned.',
      'bonus'
    );

    v_awarded := TRUE;
    v_current_balance := COALESCE(v_current_balance, 0) + 1;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'awarded', v_awarded,
    'element', p_element,
    'heartcoin_balance', v_current_balance
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.align_element_and_award_first_coin(TEXT, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.align_element_and_award_first_coin IS
'Aligns user element and awards first HeartCoin on profile completion. Idempotent - only awards coin once.';
