-- Supabase RPC function to purchase items with HeartCoins
-- This function handles the complete purchase flow including balance checks and transaction recording

CREATE OR REPLACE FUNCTION purchase_item_with_heartcoins(
    p_item_id TEXT,
    p_item_name TEXT,
    p_price_heartcoins INTEGER,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance INTEGER;
    result JSON;
BEGIN
    -- Get current HeartCoin balance
    SELECT heartcoin_balance INTO current_balance 
    FROM profiles 
    WHERE id = p_user_id;
    
    -- Handle case where user doesn't exist or balance is null
    IF current_balance IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User profile not found'
        );
    END IF;
    
    -- Check if user has sufficient HeartCoins
    IF current_balance < p_price_heartcoins THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Insufficient HeartCoins. You have ' || current_balance || ' but need ' || p_price_heartcoins
        );
    END IF;
    
    -- Deduct HeartCoins from user balance
    UPDATE profiles 
    SET heartcoin_balance = current_balance - p_price_heartcoins,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Record the HeartCoin transaction (if table exists)
    BEGIN
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
            -p_price_heartcoins,
            'purchase',
            'Redeemed ' || p_item_name || ' in store',
            NOW()
        );
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, continue without recording transaction
        NULL;
    END;
    
    -- Add item to user's collection (if table exists)
    BEGIN
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
            'merch',
            'heartcoin_purchase',
            NOW(),
            NOW()
        );
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, continue without recording item
        NULL;
    END;
    
    -- Return success
    RETURN json_build_object(
        'success', true,
        'previous_balance', current_balance,
        'new_balance', current_balance - p_price_heartcoins,
        'amount_spent', p_price_heartcoins,
        'item_id', p_item_id,
        'item_name', p_item_name
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Purchase failed: ' || SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION purchase_item_with_heartcoins(TEXT, TEXT, INTEGER, UUID) TO authenticated;