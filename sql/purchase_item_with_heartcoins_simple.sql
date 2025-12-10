-- Simplified version for card purchases
-- This function handles card purchases with fewer parameters
CREATE OR REPLACE FUNCTION purchase_item_with_heartcoins(
    p_user_id UUID,
    p_item_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
    card_cost INTEGER;
    card_name TEXT;
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
    
    -- Get card details and cost
    SELECT card_name, 
           COALESCE(digitalcost, physicalcost, 10) INTO card_name, card_cost
    FROM cards
    WHERE id = p_item_id;
    
    -- Handle case where card doesn't exist
    IF card_name IS NULL THEN
        RAISE EXCEPTION 'Card not found';
    END IF;
    
    -- Check if user has sufficient HeartCoins
    IF current_balance < card_cost THEN
        RAISE EXCEPTION 'Insufficient HeartCoins: have %, need %', current_balance, card_cost;
    END IF;
    
    -- Check if user already owns this item
    IF EXISTS (
        SELECT 1 FROM user_items 
        WHERE user_id = p_user_id AND item_id = p_item_id
    ) THEN
        RAISE EXCEPTION 'Item already owned by user';
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - card_cost;
    
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
        -card_cost, -- Negative amount for spending
        'purchase',
        'Redeemed ' || card_name || ' in store',
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
        card_name,
        'card',
        'heartcoin_purchase',
        NOW(),
        NOW()
    );
    
    -- Prepare result
    result := json_build_object(
        'success', true,
        'previous_balance', current_balance,
        'new_balance', new_balance,
        'amount_spent', card_cost,
        'item_id', p_item_id,
        'item_name', card_name,
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
GRANT EXECUTE ON FUNCTION purchase_item_with_heartcoins(UUID, TEXT) TO authenticated;