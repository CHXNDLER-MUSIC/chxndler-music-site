-- FIX: claim_tour_reward was recording claims in `user_rewards` (for dedup)
-- but never inserting into `heartcoin_transactions` — the actual ledger table
-- that the `heartcoin_balance` view and the client's realtime balance
-- subscription read from (see providers/HeartcoinBalanceProvider.tsx).
--
-- Confirmed live in Supabase on 2026-07-13: a test account had two
-- `user_rewards` rows (tour_skipped, tour_completed) with zero matching
-- `heartcoin_transactions` rows and a heartcoin_balance of 0 — the RPC was
-- returning `awarded: true` and showing the coin-earned celebration without
-- ever crediting a spendable coin. Once `user_rewards` has the dedup row,
-- re-clicking "Got it!"/"Skip for now" correctly (but unhelpfully) returns
-- `awarded: false` forever, since the dedup check doesn't know the award
-- itself never landed.
--
-- This mirrors the working pattern already used by
-- sql/award_journal_heartcoins.sql: award by inserting into
-- heartcoin_transactions; the existing trigger on that table updates
-- profiles.heartcoin_balance / heartcoin_total, which the heartcoin_balance
-- view then reflects.
--
-- Run this in the Supabase SQL editor. It replaces the function in place —
-- no schema changes, no data loss for existing user_rewards rows.

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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF p_reward_type NOT IN ('tour_skipped', 'tour_completed') THEN
    RAISE EXCEPTION 'Invalid reward_type: %', p_reward_type;
  END IF;

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
    'onboarding_tour'
  );

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
