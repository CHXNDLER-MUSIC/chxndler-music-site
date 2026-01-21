-- Debug and fix purchase function
-- This script ensures the correct function signature exists and uses the right field names

-- First, check if there are any views with wrong field names and drop them
DO $$
BEGIN
    -- Drop any problematic views that might exist
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'v_profile' 
        AND table_schema = 'public'
    ) THEN
        DROP VIEW IF EXISTS public.v_profile;
        RAISE NOTICE 'Dropped problematic v_profile view';
    END IF;
END $$;

-- Ensure the purchase function exists with correct parameters
CREATE OR REPLACE FUNCTION purchase_item_with_heartcoins(
    p_user_id UUID,
    p_item_slug TEXT,
    p_cost INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
    result JSON;
BEGIN
    -- Check if user exists and get current HeartCoin balance
    -- Explicitly use heartcoin_balance field name
    SELECT heartcoin_balance INTO current_balance
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Handle case where user doesn't exist or balance is null
    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'User profile not found or balance is null';
    END IF;
    
    -- Check if user already owns this item FIRST
    IF EXISTS (
        SELECT 1 FROM public.user_cards 
        WHERE user_id = p_user_id AND card_id = p_item_slug
    ) THEN
        RAISE EXCEPTION 'Card already owned by user';
    END IF;
    
    -- Check if user has sufficient HeartCoins
    IF current_balance < p_cost THEN
        RAISE EXCEPTION 'Insufficient HeartCoins: have %, need %', current_balance, p_cost;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - p_cost;
    
    -- Deduct HeartCoins from user balance
    UPDATE public.profiles 
    SET heartcoin_balance = new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Record the HeartCoin transaction
    INSERT INTO public.heartcoin_transactions (
        id,
        user_id,
        amount,
        transaction_type,
        description,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        -p_cost, -- Negative amount for spending
        'purchase',
        'Purchased card: ' || p_item_slug,
        NOW()
    );
    
    -- Add card to user's collection (public by default)
    INSERT INTO public.user_cards (
        id,
        user_id,
        card_id,
        format_type,
        acquisition_method,
        acquired_at,
        created_at,
        updated_at,
        is_public
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        p_item_slug,
        'digital', -- Assuming digital format for HeartCoin purchases
        'heartcoin_purchase',
        NOW(),
        NOW(),
        NOW(),
        true
    );
    
    -- Prepare result
    result := json_build_object(
        'success', true,
        'previous_balance', current_balance,
        'new_balance', new_balance,
        'amount_spent', p_cost,
        'item_slug', p_item_slug,
        'message', 'Successfully purchased and added to collection!'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the actual error for debugging
        RAISE NOTICE 'Purchase function error: %', SQLERRM;
        -- Re-raise the exception to rollback the transaction
        RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION purchase_item_with_heartcoins(UUID, TEXT, INTEGER) TO authenticated;

-- Verify the function exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'purchase_item_with_heartcoins'
        AND routine_schema = 'public'
    ) THEN
        RAISE NOTICE 'Function purchase_item_with_heartcoins exists and is ready';
    ELSE
        RAISE NOTICE 'Function purchase_item_with_heartcoins was not created properly';
    END IF;
END $$;