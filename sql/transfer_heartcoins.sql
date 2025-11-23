-- Creates heartcoin_transfers table and RPC to transfer coins between users

-- 1) Ensure a table exists to store transfers
CREATE TABLE IF NOT EXISTS public.heartcoin_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_heartcoin_transfers_sender ON public.heartcoin_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_heartcoin_transfers_receiver ON public.heartcoin_transfers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_heartcoin_transfers_created_at ON public.heartcoin_transfers(created_at);

-- Enable RLS and basic read policies (users can read transfers they are part of)
ALTER TABLE public.heartcoin_transfers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'heartcoin_transfers' AND policyname = 'Users can see own transfers'
  ) THEN
    CREATE POLICY "Users can see own transfers" ON public.heartcoin_transfers
      FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
      );
  END IF;
END$$;

-- 2) Broaden heartcoin_transactions.transaction_type to include transfers (if table exists)
DO $$
DECLARE
  has_table BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'heartcoin_transactions'
  ) INTO has_table;

  IF has_table THEN
    -- Drop the existing check constraint (name as created in our schema) if present
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'heartcoin_transactions'
        AND constraint_name = 'heartcoin_transactions_transaction_type_check'
    ) THEN
      ALTER TABLE public.heartcoin_transactions
        DROP CONSTRAINT heartcoin_transactions_transaction_type_check;
    END IF;

    -- Re-add with extended allowed values
    ALTER TABLE public.heartcoin_transactions
      ADD CONSTRAINT heartcoin_transactions_transaction_type_check
      CHECK (transaction_type IN ('earn', 'purchase', 'bonus', 'refund', 'transfer_in', 'transfer_out'));
  END IF;
END$$;

-- 3) RPC: transfer_heartcoins
-- Parameters mirror your client call: p_receiver_profile_id, p_amount, p_note
CREATE OR REPLACE FUNCTION public.transfer_heartcoins(
  p_receiver_profile_id UUID,
  p_amount INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS public.heartcoin_transfers
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_receiver_id UUID;
  v_sender_balance INTEGER;
  v_receiver_balance INTEGER;
  v_transfer public.heartcoin_transfers;
BEGIN
  -- Require auth
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate inputs
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be a positive integer';
  END IF;

  v_receiver_id := p_receiver_profile_id;
  IF v_receiver_id IS NULL THEN
    RAISE EXCEPTION 'Receiver profile id is required';
  END IF;

  IF v_receiver_id = v_sender_id THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  -- Ensure both profiles exist and lock rows in a consistent order to avoid deadlocks
  IF v_sender_id < v_receiver_id THEN
    SELECT heartcoin_balance INTO v_sender_balance FROM public.profiles WHERE id = v_sender_id FOR UPDATE;
    SELECT heartcoin_balance INTO v_receiver_balance FROM public.profiles WHERE id = v_receiver_id FOR UPDATE;
  ELSE
    SELECT heartcoin_balance INTO v_receiver_balance FROM public.profiles WHERE id = v_receiver_id FOR UPDATE;
    SELECT heartcoin_balance INTO v_sender_balance FROM public.profiles WHERE id = v_sender_id FOR UPDATE;
  END IF;

  IF v_sender_balance IS NULL THEN
    RAISE EXCEPTION 'Sender profile not found';
  END IF;
  IF v_receiver_balance IS NULL THEN
    RAISE EXCEPTION 'Receiver profile not found';
  END IF;

  -- Balance check
  IF v_sender_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient HeartCoins: have %, need %', v_sender_balance, p_amount;
  END IF;

  -- Perform balance updates
  UPDATE public.profiles SET heartcoin_balance = heartcoin_balance - p_amount, updated_at = NOW() WHERE id = v_sender_id;
  UPDATE public.profiles SET heartcoin_balance = heartcoin_balance + p_amount, updated_at = NOW() WHERE id = v_receiver_id;

  -- Log in transfer table and return the row
  INSERT INTO public.heartcoin_transfers (sender_id, receiver_id, amount, note)
  VALUES (v_sender_id, v_receiver_id, p_amount, p_note)
  RETURNING * INTO v_transfer;

  -- Optional: also log entries in heartcoin_transactions if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'heartcoin_transactions'
  ) THEN
    INSERT INTO public.heartcoin_transactions (user_id, amount, transaction_type, description, metadata, created_at)
    VALUES
      (v_sender_id, -p_amount, 'transfer_out', 'Sent HeartCoins', jsonb_build_object('to', v_receiver_id, 'note', p_note), NOW()),
      (v_receiver_id,  p_amount, 'transfer_in',  'Received HeartCoins', jsonb_build_object('from', v_sender_id, 'note', p_note), NOW());
  END IF;

  RETURN v_transfer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_heartcoins(UUID, INTEGER, TEXT) TO authenticated;

