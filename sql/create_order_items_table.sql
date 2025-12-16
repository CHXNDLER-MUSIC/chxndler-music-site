-- Create order_items table for tracking individual items in an order
-- This allows for bulk orders with multiple different items

CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    merch_item_id UUID REFERENCES public.merch_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_heartcoins INTEGER NOT NULL,
    total_price_heartcoins INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_unit_price CHECK (unit_price_heartcoins >= 0),
    CONSTRAINT positive_total_price CHECK (total_price_heartcoins >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_merch_item_id ON public.order_items(merch_item_id);

-- Row Level Security
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see order items from their own orders
CREATE POLICY "Users can view their own order items" ON public.order_items
    FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM public.orders WHERE user_id = auth.uid()
        )
    );

-- Policy: Only the system can insert order items (via RPC functions)
CREATE POLICY "System can insert order items" ON public.order_items
    FOR INSERT
    WITH CHECK (true); -- Will be controlled by RPC function security

-- Policy: No direct updates or deletes
CREATE POLICY "No direct modifications" ON public.order_items
    FOR UPDATE
    USING (false);

CREATE POLICY "No direct deletions" ON public.order_items
    FOR DELETE
    USING (false);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_order_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_items_updated_at
    BEFORE UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_items_updated_at();