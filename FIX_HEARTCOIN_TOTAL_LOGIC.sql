-- Fix heartcoin total logic to ensure it's a lifetime counter that never decreases
-- This migration corrects any issues where heartcoin_total might be incorrectly decremented

BEGIN;

-- First, ensure heartcoin_total column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heartcoin_total integer NOT NULL DEFAULT 0;

-- Fix any profiles where heartcoin_total is less than heartcoin_balance
-- This should not happen in a correct system, but we'll fix any inconsistencies
UPDATE public.profiles 
SET heartcoin_total = heartcoin_balance
WHERE heartcoin_total < heartcoin_balance;

-- Update the heartcoin balance trigger to ensure correct logic
CREATE OR REPLACE FUNCTION update_profile_heartcoin_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- For positive amounts (earning): increase both balance and total
  -- For negative amounts (spending): decrease balance only, total stays same
  UPDATE public.profiles 
  SET 
    heartcoin_balance = COALESCE(heartcoin_balance, 0) + NEW.amount,
    heartcoin_total = CASE 
      WHEN NEW.amount > 0 THEN COALESCE(heartcoin_total, 0) + NEW.amount
      ELSE COALESCE(heartcoin_total, 0)  -- Keep same total for spending
    END,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  -- Prevent negative balances (safety check)
  UPDATE public.profiles
  SET heartcoin_balance = 0
  WHERE id = NEW.user_id AND heartcoin_balance < 0;
  
  -- Log the balance update for debugging
  RAISE LOG 'Updated heartcoin for user % by amount %, new balance: %, total: %', 
    NEW.user_id, 
    NEW.amount, 
    (SELECT heartcoin_balance FROM public.profiles WHERE id = NEW.user_id),
    (SELECT heartcoin_total FROM public.profiles WHERE id = NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS heartcoin_transaction_balance_update ON public.heartcoin_transactions;
CREATE TRIGGER heartcoin_transaction_balance_update
  AFTER INSERT ON public.heartcoin_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_heartcoin_balance();

-- Create a helper function to safely transfer heartcoins between users
CREATE OR REPLACE FUNCTION transfer_heartcoins(
  from_user_id uuid,
  to_user_id uuid,
  amount integer,
  description text DEFAULT 'Transfer'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  from_balance integer;
BEGIN
  -- Check sender has enough balance
  SELECT heartcoin_balance INTO from_balance
  FROM public.profiles
  WHERE id = from_user_id;
  
  IF from_balance IS NULL OR from_balance < amount THEN
    RAISE EXCEPTION 'Insufficient heartcoin balance';
  END IF;
  
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be positive';
  END IF;
  
  -- Create transactions (triggers will update balances)
  INSERT INTO public.heartcoin_transactions (user_id, amount, description, transaction_type)
  VALUES 
    (from_user_id, -amount, description || ' (sent)', 'transfer_out'),
    (to_user_id, amount, description || ' (received)', 'transfer_in');
  
  RAISE LOG 'Transferred % heartcoins from % to %', amount, from_user_id, to_user_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION transfer_heartcoins(uuid, uuid, integer, text) TO authenticated, service_role;

COMMIT;