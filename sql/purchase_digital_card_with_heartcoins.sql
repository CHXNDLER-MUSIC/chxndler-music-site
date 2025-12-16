-- RPC function for purchasing digital cards with heartcoins
-- This is the canonical function for digital card purchases
CREATE OR REPLACE FUNCTION purchase_digital_card_with_heartcoins(
    p_card_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    current_balance INTEGER;
    card_item RECORD;
    total_cost INTEGER;
    new_balance INTEGER;
    purchase_id UUID;
BEGIN
    -- Get current user ID from auth context
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: User must be logged in';
    END IF;
    
    -- Get card and validate
    SELECT * INTO card_item
    FROM public.cards
    WHERE id = p_card_id AND is_digital = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ITEM_NOT_FOUND: Card not found or not available for digital purchase';
    END IF;
    
    -- Get total cost (use digital price)
    total_cost := COALESCE(card_item.price_heartcoins_digital, 5);
    
    -- Get user's current balance with row lock
    SELECT heartcoin_balance INTO current_balance
    FROM profiles
    WHERE id = current_user_id
    FOR UPDATE;
    
    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'USER_NOT_FOUND: User profile not found';
    END IF;
    
    -- Check sufficient funds
    IF current_balance < total_cost THEN
        RAISE EXCEPTION 'INSUFFICIENT_FUNDS: Have %, need %', current_balance, total_cost;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - total_cost;
    
    -- Start atomic transaction
    
    -- 1. Create digital card purchase record
    INSERT INTO public.digital_card_purchases (
        id,
        user_id,
        card_id,
        price_heartcoins,
        status,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        current_user_id,
        p_card_id,
        total_cost,
        'completed',
        NOW(),
        NOW()
    ) RETURNING id INTO purchase_id;
    
    -- 2. Record HeartCoin transaction
    INSERT INTO heartcoin_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        metadata,
        created_at
    ) VALUES (
        current_user_id,
        -total_cost, -- Negative amount for spending
        'purchase',
        'Purchased digital card: ' || card_item.card_name,
        jsonb_build_object(
            'digital_purchase_id', purchase_id,
            'card_id', p_card_id,
            'card_name', card_item.card_name,
            'purchase_type', 'digital_card',
            'total_cost', total_cost
        ),
        NOW()
    );
    
    -- 3. Deduct HeartCoins from user balance (with bypass)
    PERFORM set_config('app.allow_balance_update', '1', true);
    UPDATE profiles 
    SET heartcoin_balance = new_balance,
        updated_at = NOW()
    WHERE id = current_user_id;
    PERFORM set_config('app.allow_balance_update', '0', true);
    
    -- 4. Grant ownership: insert into user_cards with conflict handling
    INSERT INTO public.user_cards (user_id, card_id, source)
    VALUES (current_user_id, p_card_id, 'purchase')
    ON CONFLICT (user_id, card_id) DO NOTHING;
    
    RETURN purchase_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Ensure bypass is turned off on error
        PERFORM set_config('app.allow_balance_update', '0', true);
        -- Re-raise the exception to rollback the transaction
        RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION purchase_digital_card_with_heartcoins(UUID) TO authenticated;