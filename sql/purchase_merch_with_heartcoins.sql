-- RPC function for purchasing merch with heartcoins including shipping info
-- Matches the signature requested: purchase_merch_with_heartcoins(p_items, p_full_name, p_address_line1, p_address_line2, p_city, p_state, p_zip, p_country)

CREATE OR REPLACE FUNCTION purchase_merch_with_heartcoins(
    p_items JSONB, -- Array of items: [{"merch_item_id":"<uuid>","quantity":1}]
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
AS $$
DECLARE
    current_user_id UUID;
    current_balance INTEGER;
    total_cost INTEGER := 0;
    new_balance INTEGER;
    order_id UUID;
    item_record RECORD;
    merch_item RECORD;
    item_cost INTEGER;
    item_data JSONB;
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
    
    -- Validate p_items is an array
    IF jsonb_typeof(p_items) != 'array' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Items must be an array';
    END IF;
    
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: At least one item is required';
    END IF;
    
    -- Calculate total cost and validate all items exist
    FOR item_data IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Validate item structure
        IF NOT (item_data ? 'merch_item_id' AND item_data ? 'quantity') THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Each item must have merch_item_id and quantity';
        END IF;
        
        -- Get merch item and validate
        SELECT * INTO merch_item
        FROM public.merch_items
        WHERE id = (item_data->>'merch_item_id')::UUID 
        AND is_active = true;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'ITEM_NOT_FOUND: Merch item % not found or not available', item_data->>'merch_item_id';
        END IF;
        
        -- Calculate cost for this item
        item_cost := merch_item.price_heartcoins * (item_data->>'quantity')::INTEGER;
        total_cost := total_cost + item_cost;
    END LOOP;
    
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
    
    -- 1. Deduct HeartCoins from user balance
    UPDATE profiles 
    SET heartcoin_balance = new_balance,
        updated_at = NOW()
    WHERE id = current_user_id;
    
    -- 2. Create a single order with shipping info
    INSERT INTO public.orders (
        id,
        user_id,
        item_id,
        item_name,
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
        'bulk_order', -- Use placeholder for multi-item orders
        'Bulk Merch Order',
        jsonb_array_length(p_items),
        total_cost,
        'pending_fulfillment',
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
    
    -- 3. Record HeartCoin transaction
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
        'Purchased merchandise from store',
        jsonb_build_object(
            'order_id', order_id,
            'items', p_items,
            'total_cost', total_cost,
            'shipping_info', jsonb_build_object(
                'full_name', p_full_name,
                'address_line1', p_address_line1,
                'address_line2', p_address_line2,
                'city', p_city,
                'state', p_state,
                'zip', p_zip,
                'country', p_country
            )
        ),
        NOW()
    );
    
    -- 4. Create order items for each purchased item
    FOR item_data IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO merch_item
        FROM public.merch_items
        WHERE id = (item_data->>'merch_item_id')::UUID;
        
        INSERT INTO public.order_items (
            order_id,
            merch_item_id,
            item_name,
            quantity,
            unit_price_heartcoins,
            total_price_heartcoins,
            created_at
        ) VALUES (
            order_id,
            (item_data->>'merch_item_id')::UUID,
            merch_item.name,
            (item_data->>'quantity')::INTEGER,
            merch_item.price_heartcoins,
            merch_item.price_heartcoins * (item_data->>'quantity')::INTEGER,
            NOW()
        );
    END LOOP;
    
    RETURN order_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Re-raise the exception to rollback the transaction
        RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION purchase_merch_with_heartcoins(JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;