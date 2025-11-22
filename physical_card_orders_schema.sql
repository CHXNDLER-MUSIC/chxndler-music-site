-- Physical Card Orders Table Schema
-- This table stores physical card purchase orders with shipping information

CREATE TABLE physical_card_orders (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    card_key text NOT NULL, -- The card identifier (e.g., "KID FOREVER", "LIGHTNING")
    full_name text NOT NULL,
    address_line1 text NOT NULL,
    address_line2 text, -- Optional apartment/unit
    city text NOT NULL,
    state text NOT NULL,
    postal_code text NOT NULL,
    country text DEFAULT 'US' NOT NULL,
    cost_heartcoins integer NOT NULL,
    status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster user queries
CREATE INDEX idx_physical_card_orders_user_id ON physical_card_orders(user_id);
CREATE INDEX idx_physical_card_orders_status ON physical_card_orders(status);
CREATE INDEX idx_physical_card_orders_created_at ON physical_card_orders(created_at);

-- RLS (Row Level Security) policies
ALTER TABLE physical_card_orders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own orders
CREATE POLICY "Users can view own orders" ON physical_card_orders
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own orders
CREATE POLICY "Users can insert own orders" ON physical_card_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own orders (for address changes, etc.)
CREATE POLICY "Users can update own orders" ON physical_card_orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_physical_card_orders_updated_at
    BEFORE UPDATE ON physical_card_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();