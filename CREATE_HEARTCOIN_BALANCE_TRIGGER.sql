-- Trigger to automatically update profile heartcoin_balance when heartcoin_transactions are inserted
-- This ensures the user's profile balance stays in sync with their transaction history

CREATE OR REPLACE FUNCTION update_profile_heartcoin_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's heartcoin_balance in profiles table
  UPDATE public.profiles 
  SET 
    heartcoin_balance = COALESCE(heartcoin_balance, 0) + NEW.amount,
    heartcoin_total = COALESCE(heartcoin_total, 0) + GREATEST(NEW.amount, 0), -- Only add positive amounts to total earned
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  -- Log the balance update for debugging
  RAISE LOG 'Updated heartcoin balance for user % by amount %, new balance: %', 
    NEW.user_id, NEW.amount, (SELECT heartcoin_balance FROM public.profiles WHERE id = NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS heartcoin_transaction_balance_update ON public.heartcoin_transactions;

-- Create the trigger
CREATE TRIGGER heartcoin_transaction_balance_update
  AFTER INSERT ON public.heartcoin_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_heartcoin_balance();

COMMENT ON FUNCTION update_profile_heartcoin_balance() IS 'Automatically updates profile heartcoin_balance when transactions are added';
COMMENT ON TRIGGER heartcoin_transaction_balance_update ON public.heartcoin_transactions IS 'Updates user profile balance after heartcoin transactions';