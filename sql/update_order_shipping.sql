-- Function to update shipping information for an order
-- This function allows users to update shipping details after purchase

CREATE OR REPLACE FUNCTION update_order_shipping(
    p_user_id UUID,
    p_order_id BIGINT,
    p_shipping_full_name TEXT,
    p_shipping_address_line1 TEXT,
    p_shipping_address_line2 TEXT DEFAULT NULL,
    p_shipping_city TEXT,
    p_shipping_state TEXT,
    p_shipping_zip TEXT,
    p_shipping_country TEXT DEFAULT 'United States'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_record RECORD;
    result JSON;
BEGIN
    -- Validate required fields
    IF p_shipping_full_name IS NULL OR trim(p_shipping_full_name) = '' THEN
        RAISE EXCEPTION 'MISSING_FIELD: Full name is required';
    END IF;
    
    IF p_shipping_address_line1 IS NULL OR trim(p_shipping_address_line1) = '' THEN
        RAISE EXCEPTION 'MISSING_FIELD: Address line 1 is required';
    END IF;
    
    IF p_shipping_city IS NULL OR trim(p_shipping_city) = '' THEN
        RAISE EXCEPTION 'MISSING_FIELD: City is required';
    END IF;
    
    IF p_shipping_state IS NULL OR trim(p_shipping_state) = '' THEN
        RAISE EXCEPTION 'MISSING_FIELD: State is required';
    END IF;
    
    IF p_shipping_zip IS NULL OR trim(p_shipping_zip) = '' THEN
        RAISE EXCEPTION 'MISSING_FIELD: ZIP code is required';
    END IF;
    
    -- Get and validate the order belongs to the user
    SELECT * INTO order_record
    FROM public.orders
    WHERE id = p_order_id AND user_id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: Order not found or does not belong to user';
    END IF;
    
    -- Check if order is in a valid state for shipping updates
    IF order_record.status NOT IN ('pending_shipping', 'paid') THEN
        RAISE EXCEPTION 'INVALID_ORDER_STATE: Order is in % state and cannot be updated', order_record.status;
    END IF;
    
    -- Update the order with shipping information
    UPDATE public.orders
    SET 
        shipping_full_name = trim(p_shipping_full_name),
        shipping_address_line1 = trim(p_shipping_address_line1),
        shipping_address_line2 = CASE 
            WHEN p_shipping_address_line2 IS NOT NULL AND trim(p_shipping_address_line2) != '' 
            THEN trim(p_shipping_address_line2) 
            ELSE NULL 
        END,
        shipping_city = trim(p_shipping_city),
        shipping_state = trim(p_shipping_state),
        shipping_zip = trim(p_shipping_zip),
        shipping_country = trim(p_shipping_country),
        status = CASE 
            WHEN status = 'pending_shipping' THEN 'pending_fulfillment'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Prepare result
    result := json_build_object(
        'success', true,
        'order_id', p_order_id,
        'status', CASE 
            WHEN order_record.status = 'pending_shipping' THEN 'pending_fulfillment'
            ELSE order_record.status
        END,
        'shipping_info_updated', true,
        'message', 'Shipping information updated successfully'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Re-raise the exception to rollback the transaction
        RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_order_shipping(UUID, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;