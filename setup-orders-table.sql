-- Create orders table for Heart Card purchases

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  card_title text NOT NULL,
  heart_coins_spent integer NOT NULL,
  full_name text NOT NULL,
  street_address text NOT NULL,
  apartment text,
  city text NOT NULL,
  state_region text NOT NULL,
  zip_postal text NOT NULL,
  country text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_card_title ON public.orders (card_title);

-- Enable RLS (Row Level Security)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies for orders table
-- Allow authenticated users to insert their own orders
CREATE POLICY IF NOT EXISTS "allow_insert_own_orders"
  ON public.orders FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view their own orders
CREATE POLICY IF NOT EXISTS "allow_select_own_orders"
  ON public.orders FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

-- Function to ensure orders table exists
CREATE OR REPLACE FUNCTION public.create_orders_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function ensures the orders table exists
  -- The table creation is handled above, this is just a placeholder
  -- for the API call consistency
  NULL;
END;
$$;