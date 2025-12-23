-- RPC function to award heartcoins for journal entry (idempotent - once per NY day per user)
-- Checks for JOURNAL_BONUS effect and applies multiplier if active

CREATE OR REPLACE FUNCTION public.award_journal_heartcoins()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_today_ny DATE;
  v_already_awarded BOOLEAN := FALSE;
  v_base_amount INTEGER := 1;
  v_multiplier INTEGER := 1;
  v_final_amount INTEGER;
  v_effect_id UUID;
  v_result JSON;
BEGIN
  -- Require authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- Calculate today's date in America/New_York timezone
  v_today_ny := (NOW() AT TIME ZONE 'America/New_York')::DATE;

  -- Check if user already got journal heartcoins today
  -- Look for a 'journal_entry' transaction for this user today (NY time)
  SELECT EXISTS (
    SELECT 1 FROM public.heartcoin_transactions
    WHERE user_id = v_user_id
      AND transaction_type = 'earn'
      AND description LIKE '%Journal%'
      AND (created_at AT TIME ZONE 'America/New_York')::DATE = v_today_ny
  ) INTO v_already_awarded;

  IF v_already_awarded THEN
    RETURN json_build_object(
      'ok', true,
      'already_awarded', true,
      'awarded', 0,
      'message', 'Journal heartcoins already awarded today'
    );
  END IF;

  -- Check for active JOURNAL_BONUS effect
  -- The effect should be active for today and not yet consumed
  SELECT id, COALESCE((metadata->>'multiplier')::INTEGER, 2)
  INTO v_effect_id, v_multiplier
  FROM public.user_effects
  WHERE user_id = v_user_id
    AND kind = 'JOURNAL_BONUS'
    AND active_date = v_today_ny
    AND consumed_at IS NULL
  LIMIT 1;

  -- If no effect found, v_effect_id will be NULL and v_multiplier defaults to 1
  IF v_effect_id IS NULL THEN
    v_multiplier := 1;
  END IF;

  -- Calculate final amount
  v_final_amount := v_base_amount * v_multiplier;

  -- Award heartcoins by inserting a transaction
  -- The existing trigger will update the profile balance
  INSERT INTO public.heartcoin_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    metadata,
    created_at
  ) VALUES (
    v_user_id,
    v_final_amount,
    'earn',
    CASE
      WHEN v_multiplier > 1 THEN 'Journal Entry (Reflection Boost ' || v_multiplier || 'x)'
      ELSE 'Journal Entry'
    END,
    jsonb_build_object(
      'source', 'journal_entry',
      'date_ny', v_today_ny::TEXT,
      'base_amount', v_base_amount,
      'multiplier', v_multiplier,
      'effect_id', v_effect_id
    ),
    NOW()
  );

  -- If a JOURNAL_BONUS effect was used, mark it as consumed
  IF v_effect_id IS NOT NULL THEN
    UPDATE public.user_effects
    SET consumed_at = NOW()
    WHERE id = v_effect_id;
  END IF;

  -- Update profile counters for badge progress
  UPDATE public.profiles
  SET
    total_reflections = COALESCE(total_reflections, 0) + 1,
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN json_build_object(
    'ok', true,
    'already_awarded', false,
    'awarded', v_final_amount,
    'multiplier_used', v_multiplier > 1,
    'multiplier', v_multiplier,
    'date_ny', v_today_ny::TEXT
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.award_journal_heartcoins() TO authenticated;

-- Ensure user_effects table has the columns we need (if it doesn't exist, this is informational)
COMMENT ON FUNCTION public.award_journal_heartcoins IS
'Awards 1 HeartCoin for journal entry (idempotent - once per NY day).
Checks user_effects for JOURNAL_BONUS with multiplier.
Returns JSON: { ok, awarded, already_awarded, multiplier_used, multiplier, date_ny }';
