-- FIX: claim_tour_reward used the same heartcoin_transactions.source value
-- ('onboarding_tour') for BOTH tour_completed and tour_skipped. The table has
-- a unique constraint uq_heartcoin_tx_user_day_source on
-- (user_id, day, source) — meant to stop a daily-repeatable reward (like the
-- journal bonus) from being double-awarded the same day. Because both tour
-- reward types shared one source string, it also blocked the SECOND of the
-- two one-time tour rewards whenever both happened to be claimed on the same
-- calendar day (e.g. user skips once, then later restarts the tour and
-- clicks "Got it!").
--
-- Symptom confirmed live: claim_tour_reward raised
--   23505 duplicate key value violates unique constraint
--   "uq_heartcoin_tx_user_day_source"
--   Key (user_id, day, source)=(<user>, <today>, onboarding_tour) already exists.
-- The RAISE rolled back the whole function call (including the user_rewards
-- insert), so `awarded` never became true and no coin/badge fired client-side.
--
-- Fix: give each reward_type its own source value so they can't collide.
-- Also wrap the heartcoin_transactions insert in its own exception block so
-- a future unique-constraint hit degrades to "already awarded" instead of
-- rolling back the user_rewards dedup row and hard-failing the RPC.
--
-- Run this in the Supabase SQL editor. Replaces the function in place.

CREATE OR REPLACE FUNCTION public.claim_tour_reward(p_reward_type TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_already_claimed BOOLEAN := FALSE;
  v_amount INTEGER := 1;
  v_balance INTEGER;
  v_source TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF p_reward_type NOT IN ('tour_skipped', 'tour_completed') THEN
    RAISE EXCEPTION 'Invalid reward_type: %', p_reward_type;
  END IF;

  -- Distinct source per reward type so tour_completed and tour_skipped
  -- never collide under the (user_id, day, source) unique constraint.
  v_source := 'onboarding_tour_' || p_reward_type;

  SELECT EXISTS (
    SELECT 1 FROM public.user_rewards
    WHERE user_id = v_user_id AND reward_type = p_reward_type
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.heartcoin_balance
    WHERE user_id = v_user_id;

    RETURN json_build_object(
      'awarded', false,
      'amount', 0,
      'reward_type', p_reward_type,
      'heartcoin_balance', COALESCE(v_balance, 0)
    );
  END IF;

  INSERT INTO public.user_rewards (user_id, reward_type, amount)
  VALUES (v_user_id, p_reward_type, v_amount);

  -- Award the coin by inserting a transaction — same pattern as
  -- award_journal_heartcoins.sql. The existing trigger on this table
  -- updates profiles.heartcoin_balance / heartcoin_total.
  --
  -- Wrapped so a unique_violation here (e.g. a rare race, or a legacy
  -- 'onboarding_tour' row from before this fix) degrades gracefully instead
  -- of rolling back the user_rewards row above and hard-failing the RPC.
  BEGIN
    INSERT INTO public.heartcoin_transactions (
      user_id,
      amount,
      transaction_type,
      reason,
      description,
      source
    ) VALUES (
      v_user_id,
      v_amount,
      'earn',
      p_reward_type,
      CASE
        WHEN p_reward_type = 'tour_completed' THEN 'Completed onboarding tour'
        ELSE 'Skipped onboarding tour'
      END,
      v_source
    );
  EXCEPTION WHEN unique_violation THEN
    NULL; -- user_rewards dedup row stands; balance just won't double-credit
  END;

  SELECT COALESCE(balance, 0) INTO v_balance
  FROM public.heartcoin_balance
  WHERE user_id = v_user_id;

  RETURN json_build_object(
    'awarded', true,
    'amount', v_amount,
    'reward_type', p_reward_type,
    'heartcoin_balance', COALESCE(v_balance, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_tour_reward(TEXT) TO authenticated;
