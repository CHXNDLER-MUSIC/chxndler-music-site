-- Migration for HeartCoins Purchase Flow
-- Creates required tables, constraints, and triggers for the new canonical purchase system
-- Safe to run multiple times

BEGIN;

-- 1. Ensure orders table has all required columns and proper constraints
DO $$ 
BEGIN
    -- Add order_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'order_type'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'merch'
            CHECK (order_type IN ('merch', 'physical_card', 'digital_card'));
    END IF;

    -- Add payment_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'heartcoins'
            CHECK (payment_type IN ('heartcoins', 'stripe', 'free'));
    END IF;

    -- Ensure status constraint includes all required statuses
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('pending', 'paid', 'pending_shipping', 'pending_fulfillment', 'processing', 'shipped', 'delivered', 'cancelled'));

    -- Add card_id column if it doesn't exist (for card orders)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'card_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN card_id UUID REFERENCES public.cards(id);
    END IF;

    -- Ensure all shipping fields exist
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_full_name TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address_line1 TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address_line2 TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_city TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_state TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_zip TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_country TEXT DEFAULT 'United States';
    
    -- Ensure quantity and total_heartcoins exist
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_heartcoins INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS merch_item_id UUID REFERENCES public.merch_items(id);
END $$;

-- 2. Add shipping constraint for physical orders (not implies form)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_shipping_required_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_shipping_required_check 
    CHECK (
        NOT (order_type IN ('merch', 'physical_card')) OR 
        (
            shipping_full_name IS NOT NULL AND
            shipping_address_line1 IS NOT NULL AND
            shipping_city IS NOT NULL AND
            shipping_state IS NOT NULL AND
            shipping_zip IS NOT NULL AND
            shipping_country IS NOT NULL
        )
    );

-- 3. Create digital_card_purchases table for digital card purchases (no shipping)
CREATE TABLE IF NOT EXISTS public.digital_card_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id),
    price_heartcoins INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for digital_card_purchases
ALTER TABLE public.digital_card_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for digital_card_purchases
DROP POLICY IF EXISTS "Users can view their own digital card purchases" ON public.digital_card_purchases;
DROP POLICY IF EXISTS "Users can insert their own digital card purchases" ON public.digital_card_purchases;

CREATE POLICY "Users can view their own digital card purchases"
    ON public.digital_card_purchases
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Service can insert digital card purchases"
    ON public.digital_card_purchases
    FOR INSERT
    WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_digital_card_purchases_user_id ON public.digital_card_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_digital_card_purchases_card_id ON public.digital_card_purchases(card_id);
CREATE INDEX IF NOT EXISTS idx_digital_card_purchases_created_at ON public.digital_card_purchases(created_at);

-- 4. Ensure heartcoin_transactions has all required columns
ALTER TABLE public.heartcoin_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 5. Add pricing columns to cards table for digital/physical pricing
DO $$
BEGIN
    -- Add digital and physical flags and pricing
    ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT true;
    ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS is_physical BOOLEAN DEFAULT true;
    ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS price_heartcoins_digital INTEGER DEFAULT 5;
    ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS price_heartcoins_physical INTEGER DEFAULT 15;
    ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS card_description TEXT;
END $$;

-- 6. Create trigger to prevent direct updates to heartcoin_balance unless bypass is set
CREATE OR REPLACE FUNCTION prevent_direct_balance_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow updates if the bypass config is set
    IF current_setting('app.allow_balance_update', true) = '1' THEN
        RETURN NEW;
    END IF;
    
    -- Prevent direct updates to heartcoin_balance
    IF OLD.heartcoin_balance IS DISTINCT FROM NEW.heartcoin_balance THEN
        RAISE EXCEPTION 'Direct updates to heartcoin_balance are not allowed. Use RPC functions.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_balance_update_trigger ON public.profiles;

-- Create the trigger
CREATE TRIGGER prevent_balance_update_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_direct_balance_update();

-- 7. Grant necessary permissions
GRANT SELECT, INSERT ON public.digital_card_purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.cards TO authenticated;
GRANT SELECT ON public.merch_items TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;