-- Update the orders table to work with merch_items and add shipping columns
-- This will normalize the orders table to reference merch_items and include shipping info

-- First add the missing columns if they don't exist
DO $$ 
BEGIN
    -- Add merch_item_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'merch_item_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN merch_item_id UUID REFERENCES public.merch_items(id);
    END IF;

    -- Add quantity column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'quantity'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
    END IF;

    -- Add total_heartcoins column if it doesn't exist (rename from price_heartcoins for clarity)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'total_heartcoins'
    ) THEN
        -- If price_heartcoins exists, rename it. Otherwise create new column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'price_heartcoins'
        ) THEN
            ALTER TABLE public.orders RENAME COLUMN price_heartcoins TO total_heartcoins;
        ELSE
            ALTER TABLE public.orders ADD COLUMN total_heartcoins INTEGER NOT NULL DEFAULT 0;
        END IF;
    END IF;

    -- Update status column to include new statuses
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'status'
    ) THEN
        -- Drop the old constraint and add new one with more statuses
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
        ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('pending', 'paid', 'pending_shipping', 'pending_fulfillment', 'processing', 'shipped', 'delivered', 'cancelled'));
    END IF;

    -- Add shipping columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_full_name'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN shipping_full_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_address_line1'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN shipping_address_line1 TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_address_line2'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN shipping_address_line2 TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_city'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN shipping_city TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_state'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN shipping_state TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_zip'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN shipping_zip TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'shipping_country'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN shipping_country TEXT DEFAULT 'United States';
    END IF;

    -- Add variant selection columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'selected_variant'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN selected_variant JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'selected_color'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN selected_color TEXT DEFAULT NULL;
    END IF;
END $$;

-- Add index on merch_item_id for better performance
CREATE INDEX IF NOT EXISTS idx_orders_merch_item_id ON public.orders (merch_item_id);

-- Add RLS policy for updating orders (users can update their own orders)
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());