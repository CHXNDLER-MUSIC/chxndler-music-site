-- Supabase RPC function to purchase items with HeartCoins
-- This function handles the complete purchase flow including balance checks and transaction recording

CREATE OR REPLACE FUNCTION purchase_item_with_heartcoins(
    p_user_id UUID,
    p_item_id TEXT,
    p_item_name TEXT,
    p_price_heartcoins INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
    transaction_id UUID;
    result JSON;
BEGIN
    -- Check if user exists and get current HeartCoin balance
    SELECT heartcoin_balance INTO current_balance
    FROM profiles
    WHERE id = p_user_id;
    
    -- Handle case where user doesn't exist or balance is null
    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
    
    -- Check if user has sufficient HeartCoins
    IF current_balance < p_price_heartcoins THEN
        RAISE EXCEPTION 'Insufficient HeartCoins: have %, need %', current_balance, p_price_heartcoins;
    END IF;
    
    -- Check if user already owns this item
    IF EXISTS (
        SELECT 1 FROM user_items 
        WHERE user_id = p_user_id AND item_id = p_item_id
    ) THEN
        RAISE EXCEPTION 'Item already owned by user';
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - p_price_heartcoins;
    
    -- Start transaction (implicit in function)
    
    -- 1. Deduct HeartCoins from user balance
    UPDATE profiles 
    SET heartcoin_balance = new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- 2. Record the HeartCoin transaction
    INSERT INTO heartcoin_transactions (
        id,
        user_id,
        amount,
        transaction_type,
        description,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        -p_price_heartcoins, -- Negative amount for spending
        'purchase',
        'Redeemed ' || p_item_name || ' in store',
        NOW()
    ) RETURNING id INTO transaction_id;
    
    -- 3. Add item to user's collection
    INSERT INTO user_items (
        id,
        user_id,
        item_id,
        item_name,
        item_type,
        acquisition_method,
        acquisition_date,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        p_item_id,
        p_item_name,
        'card', -- Assuming these are cards, adjust as needed
        'heartcoin_purchase',
        NOW(),
        NOW()
    );
    
    -- Prepare result
    result := json_build_object(
        'success', true,
        'previous_balance', current_balance,
        'new_balance', new_balance,
        'amount_spent', p_price_heartcoins,
        'item_id', p_item_id,
        'item_name', p_item_name,
        'transaction_id', transaction_id
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Re-raise the exception to rollback the transaction
        RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION purchase_item_with_heartcoins(UUID, TEXT, TEXT, INTEGER) TO authenticated;