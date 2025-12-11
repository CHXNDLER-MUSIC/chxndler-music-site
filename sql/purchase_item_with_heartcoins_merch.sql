-- Updated purchase function that uses merch_items table as source of truth
-- This function replaces the old one that accepted price from the client

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS purchase_item_with_heartcoins(UUID, TEXT, TEXT, INTEGER);

-- Create the new secure purchase function
CREATE OR REPLACE FUNCTION purchase_item_with_heartcoins(
    p_user_id UUID,
    p_merch_item_id UUID,
    p_quantity INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance INTEGER;
    unit_price INTEGER;
    total_price INTEGER;
    new_balance INTEGER;
    transaction_id UUID;
    order_id BIGINT;
    merch_item RECORD;
    result JSON;
BEGIN
    -- Validate quantity
    IF p_quantity < 1 THEN
        RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be at least 1';
    END IF;

    -- Get merch item details and validate it exists and is active
    SELECT * INTO merch_item
    FROM public.merch_items
    WHERE id = p_merch_item_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ITEM_NOT_FOUND: Merch item not found or not available';
    END IF;
    
    -- Get unit price from database (source of truth)
    unit_price := merch_item.price_heartcoins;
    total_price := unit_price * p_quantity;
    
    -- Check if user exists and get current HeartCoin balance
    SELECT heartcoin_balance INTO current_balance
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE; -- Lock the row to prevent race conditions
    
    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'USER_NOT_FOUND: User profile not found';
    END IF;
    
    -- Check if user has sufficient HeartCoins
    IF current_balance < total_price THEN
        RAISE EXCEPTION 'INSUFFICIENT_HEARTCOINS: Have %, need %', current_balance, total_price;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - total_price;
    
    -- Start atomic transaction
    
    -- 1. Deduct HeartCoins from user balance
    UPDATE profiles 
    SET heartcoin_balance = new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- 2. Record the HeartCoin transaction
    INSERT INTO heartcoin_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        metadata,
        created_at
    ) VALUES (
        p_user_id,
        -total_price, -- Negative amount for spending
        'purchase',
        'Purchased ' || merch_item.name || ' from store',
        jsonb_build_object(
            'merch_item_id', p_merch_item_id,
            'quantity', p_quantity,
            'unit_price', unit_price
        ),
        NOW()
    ) RETURNING id INTO transaction_id;
    
    -- 3. Create order for shipping (for physical items) or record (for digital items)
    INSERT INTO public.orders (
        user_id,
        merch_item_id,
        item_id, -- Keep for backward compatibility
        item_name, -- Keep for backward compatibility
        quantity,
        total_heartcoins,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_merch_item_id,
        merch_item.slug, -- Use slug as item_id for backward compatibility
        merch_item.name,
        p_quantity,
        total_price,
        CASE 
            WHEN merch_item.category = 'physical' THEN 'pending_shipping'
            ELSE 'paid'
        END,
        NOW(),
        NOW()
    ) RETURNING id INTO order_id;
    
    -- 4. For digital items, add to user_items table
    IF merch_item.category = 'digital' THEN
        INSERT INTO user_items (
            user_id,
            item_id,
            item_name,
            item_type,
            acquisition_method,
            metadata,
            acquisition_date,
            created_at
        ) VALUES (
            p_user_id,
            merch_item.slug,
            merch_item.name,
            'digital',
            'heartcoin_purchase',
            jsonb_build_object(
                'merch_item_id', p_merch_item_id,
                'order_id', order_id,
                'transaction_id', transaction_id
            ),
            NOW(),
            NOW()
        );
    END IF;
    
    -- Prepare result
    result := json_build_object(
        'success', true,
        'order_id', order_id,
        'previous_balance', current_balance,
        'new_balance', new_balance,
        'amount_spent', total_price,
        'merch_item_id', p_merch_item_id,
        'item_name', merch_item.name,
        'quantity', p_quantity,
        'unit_price', unit_price,
        'transaction_id', transaction_id,
        'item_category', merch_item.category,
        'requires_shipping', merch_item.category = 'physical'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Re-raise the exception to rollback the transaction
        RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION purchase_item_with_heartcoins(UUID, UUID, INTEGER) TO authenticated;