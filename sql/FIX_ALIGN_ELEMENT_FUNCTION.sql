-- FIX: align_element_and_award_first_heartcoin function
-- Fixes the column name from "element_affinity" to "element"
-- Uses bypass flag to allow heartcoin_transactions trigger to update balance
-- Run this in Supabase SQL Editor

-- Drop the old function if it exists (handles any signature)
DROP FUNCTION IF EXISTS public.align_element_and_award_first_heartcoin(TEXT);
DROP FUNCTION IF EXISTS public.align_element_and_award_first_heartcoin(TEXT, TEXT);

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.align_element_and_award_first_heartcoin(
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
  v_current_element TEXT;
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
  SELECT profile_complete, heartcoin_balance, element
  INTO v_profile_complete, v_current_balance, v_current_element
  FROM profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found',
      'awarded', false
    );
  END IF;

  -- Update profile with element and mark as complete
  -- Uses the "element" column (NOT "element_affinity")
  UPDATE profiles
  SET
    element = p_element,
    profile_complete = true,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Only award HeartCoin if profile was not already complete
  -- This makes the function idempotent - can be called multiple times safely
  IF v_profile_complete IS DISTINCT FROM true THEN
    -- Enable bypass for the heartcoin_balance update trigger
    PERFORM set_config('app.allow_balance_update', '1', true);

    -- Insert into heartcoin_transactions - a trigger will update the balance
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
GRANT EXECUTE ON FUNCTION public.align_element_and_award_first_heartcoin(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.align_element_and_award_first_heartcoin IS
'Aligns user element and awards first HeartCoin on profile completion. Uses element column (not element_affinity). Does not directly update heartcoin_balance. Idempotent - only awards coin once.';
