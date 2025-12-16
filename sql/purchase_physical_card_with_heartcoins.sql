-- RPC function for purchasing physical cards with heartcoins
-- This is the canonical function for physical card purchases
CREATE OR REPLACE FUNCTION purchase_physical_card_with_heartcoins(
    p_card_id UUID,
    p_full_name TEXT,
    p_address_line1 TEXT,
    p_address_line2 TEXT DEFAULT NULL,
    p_city TEXT,
    p_state TEXT,
    p_zip TEXT,
    p_country TEXT
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
    order_id UUID;
BEGIN
    -- Get current user ID from auth context
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: User must be logged in';
    END IF;
    
    -- Validate required shipping fields
    IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Full name is required';
    END IF;
    
    IF p_address_line1 IS NULL OR trim(p_address_line1) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Address line 1 is required';
    END IF;
    
    IF p_city IS NULL OR trim(p_city) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: City is required';
    END IF;
    
    IF p_state IS NULL OR trim(p_state) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: State is required';
    END IF;
    
    IF p_zip IS NULL OR trim(p_zip) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: ZIP code is required';
    END IF;
    
    IF p_country IS NULL OR trim(p_country) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Country is required';
    END IF;
    
    -- Get card and validate
    SELECT * INTO card_item
    FROM public.cards
    WHERE id = p_card_id AND is_physical = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ITEM_NOT_FOUND: Card not found or not available for physical purchase';
    END IF;
    
    -- Get total cost (use physical price)
    total_cost := COALESCE(card_item.price_heartcoins_physical, 15);
    
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
    
    -- 1. Create order with shipping info
    INSERT INTO public.orders (
        id,
        user_id,
        order_type,
        payment_type,
        item_id,
        item_name,
        merch_item_id,
        card_id,
        quantity,
        total_heartcoins,
        status,
        shipping_full_name,
        shipping_address_line1,
        shipping_address_line2,
        shipping_city,
        shipping_state,
        shipping_zip,
        shipping_country,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        current_user_id,
        'physical_card',
        'heartcoins',
        card_item.card_name || '_physical',
        card_item.card_name || ' (Physical Card)',
        NULL, -- No merch item for card orders
        p_card_id,
        1, -- Always quantity 1 for cards
        total_cost,
        'paid',
        trim(p_full_name),
        trim(p_address_line1),
        CASE WHEN p_address_line2 IS NOT NULL AND trim(p_address_line2) != '' 
             THEN trim(p_address_line2) 
             ELSE NULL 
        END,
        trim(p_city),
        trim(p_state),
        trim(p_zip),
        trim(p_country),
        NOW(),
        NOW()
    ) RETURNING id INTO order_id;
    
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
        'Purchased physical card: ' || card_item.card_name,
        jsonb_build_object(
            'order_id', order_id,
            'card_id', p_card_id,
            'card_name', card_item.card_name,
            'purchase_type', 'physical_card',
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
    
    RETURN order_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Ensure bypass is turned off on error
        PERFORM set_config('app.allow_balance_update', '0', true);
        -- Re-raise the exception to rollback the transaction
        RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION purchase_physical_card_with_heartcoins(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;