-- Updated purchase function for digital cards that properly uses user_cards table
-- This function is specifically designed for the BinderModal digital card purchases
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
    card_uuid UUID;
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
    
    -- Find the actual card UUID from the card name
    -- The p_item_id comes in as something like "chxndler_digital", so we need to extract the card name
    SELECT id INTO card_uuid
    FROM cards
    WHERE LOWER(REPLACE(card_name, ' ', '_')) = LOWER(REPLACE(SPLIT_PART(p_item_id, '_', 1), '_', '_'))
       OR LOWER(card_name) = LOWER(p_item_name);
    
    -- If we can't find by name matching, try to find by similar name
    IF card_uuid IS NULL THEN
        SELECT id INTO card_uuid
        FROM cards
        WHERE LOWER(card_name) LIKE '%' || LOWER(SPLIT_PART(p_item_name, ' (', 1)) || '%'
        LIMIT 1;
    END IF;
    
    -- Handle case where card doesn't exist
    IF card_uuid IS NULL THEN
        RAISE EXCEPTION 'Card not found for item: % / %', p_item_id, p_item_name;
    END IF;
    
    -- Check if user already owns this card
    IF EXISTS (
        SELECT 1 FROM user_cards 
        WHERE user_id = p_user_id AND card_id = card_uuid
    ) THEN
        RAISE EXCEPTION 'Card already owned by user';
    END IF;
    
    -- Check if user has sufficient HeartCoins
    IF current_balance < p_price_heartcoins THEN
        RAISE EXCEPTION 'Insufficient HeartCoins: have %, need %', current_balance, p_price_heartcoins;
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
        'Purchased digital card: ' || p_item_name,
        NOW()
    ) RETURNING id INTO transaction_id;
    
    -- 3. Add card to user_cards table (the main goal!)
    INSERT INTO user_cards (
        id,
        user_id,
        card_id,
        acquired_at,
        acquisition_source
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        card_uuid,
        NOW(),
        'heartcoin_purchase'
    );
    
    -- 4. Keep compatibility with existing user_items table if it exists
    -- (This is for backward compatibility in case other parts of the app still use user_items)
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
            'card',
            'heartcoin_purchase',
            NOW(),
            NOW()
        );
    EXCEPTION
        WHEN undefined_table THEN
            -- user_items table doesn't exist, that's okay
            NULL;
    END;
    
    -- Prepare result
    result := json_build_object(
        'success', true,
        'previous_balance', current_balance,
        'new_balance', new_balance,
        'amount_spent', p_price_heartcoins,
        'item_id', p_item_id,
        'item_name', p_item_name,
        'card_id', card_uuid,
        'transaction_id', transaction_id,
        'message', 'Successfully purchased digital card!'
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