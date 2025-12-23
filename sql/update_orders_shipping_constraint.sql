-- Migration to support two-step physical purchase flow
-- 1. Add requires_shipping and shipping_submitted columns
-- 2. Update constraint to allow orders without shipping when shipping_submitted=false
-- Safe to run multiple times

BEGIN;

-- 1. Add requires_shipping column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'requires_shipping'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN requires_shipping BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Add shipping_submitted column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'shipping_submitted'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN shipping_submitted BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Update existing orders to set requires_shipping based on order_type
UPDATE public.orders
SET requires_shipping = true
WHERE order_type IN ('merch', 'physical_card') AND requires_shipping IS NULL;

UPDATE public.orders
SET requires_shipping = false
WHERE order_type NOT IN ('merch', 'physical_card') AND requires_shipping IS NULL;

-- 4. Set shipping_submitted=true for existing orders that have shipping info
UPDATE public.orders
SET shipping_submitted = true
WHERE requires_shipping = true
  AND shipping_full_name IS NOT NULL
  AND shipping_address_line1 IS NOT NULL
  AND shipping_submitted IS NULL;

-- 5. Drop the old constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_shipping_required_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_shipping_fields_required;

-- 6. Create new constraint: shipping fields required only when shipping_submitted=true
-- This allows creating orders with requires_shipping=true but shipping_submitted=false
ALTER TABLE public.orders ADD CONSTRAINT orders_shipping_fields_required
    CHECK (
        -- If shipping is not required, no validation needed
        requires_shipping = false OR
        -- If shipping_submitted is false, no shipping fields required yet
        shipping_submitted = false OR
        -- If shipping_submitted is true, all fields must be present
        (
            shipping_full_name IS NOT NULL AND
            shipping_address_line1 IS NOT NULL AND
            shipping_city IS NOT NULL AND
            shipping_state IS NOT NULL AND
            shipping_zip IS NOT NULL AND
            shipping_country IS NOT NULL
        )
    );

-- 7. Add status value 'shipping_submitted' if not present
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'paid', 'pending_shipping', 'shipping_submitted', 'pending_fulfillment', 'processing', 'shipped', 'delivered', 'cancelled'));

-- 8. Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_orders_requires_shipping ON public.orders(requires_shipping);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_submitted ON public.orders(shipping_submitted);

COMMIT;
