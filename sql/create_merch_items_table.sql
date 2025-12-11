-- Create the merch_items table as the single source of truth for all merchandise
-- This will replace hardcoded items in the frontend

-- Create merch_items table
CREATE TABLE IF NOT EXISTS public.merch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  description TEXT,
  image_url TEXT,
  image_url_2 TEXT, -- Optional second image
  cost_usd NUMERIC, -- Reference price in USD (not used for HeartCoin logic)
  price_heartcoins INTEGER NOT NULL, -- The authoritative HeartCoin price
  stripe_url TEXT, -- For Stripe checkout
  is_active BOOLEAN DEFAULT true, -- Enable/disable items
  min_tier TEXT, -- Minimum user tier required
  category TEXT DEFAULT 'physical' CHECK (category IN ('physical', 'digital')), -- Item type
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_merch_items_slug ON public.merch_items (slug);
CREATE INDEX IF NOT EXISTS idx_merch_items_is_active ON public.merch_items (is_active);
CREATE INDEX IF NOT EXISTS idx_merch_items_category ON public.merch_items (category);

-- Enable RLS
ALTER TABLE public.merch_items ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active merch items
CREATE POLICY "Anyone can view active merch items"
ON public.merch_items
FOR SELECT
TO authenticated
USING (is_active = true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_merch_items_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_merch_items_updated_at ON public.merch_items;
CREATE TRIGGER update_merch_items_updated_at
    BEFORE UPDATE ON public.merch_items
    FOR EACH ROW
    EXECUTE FUNCTION update_merch_items_updated_at_column();

-- Insert the existing physical items from the hardcoded data
INSERT INTO public.merch_items (slug, name, description, image_url, image_url_2, cost_usd, price_heartcoins, stripe_url, min_tier, category, is_active) 
VALUES 
  ('necklace', 'Necklace', 'A symbol of love, connection, and everything this world stands for. It''s a keepsake for the people who found home here.', 'https://ik.imagekit.io/CHXNDLER/STORE/necklace.png', NULL, 18, 12, 'https://buy.stripe.com/bJe3cw99f28R5x7epp4gg0K', 'wanderer', 'physical', true),
  ('pin', 'PIN', 'A symbol that you belong here with the people who feel deeply, dream big, and find beauty in being different.', 'https://ik.imagekit.io/CHXNDLER/STORE/pin.png', NULL, 4.5, 3, 'https://buy.stripe.com/cNi00kfxDeVD3oZ5ST4gg0B', 'wanderer', 'physical', true),
  ('patch', 'PATCH', 'Stitch this into your world as a quiet reminder that this isn''t just music, it''s a community.', 'https://ik.imagekit.io/CHXNDLER/STORE/patch.png', 'https://ik.imagekit.io/CHXNDLER/STORE/patch-inverse.png', 6, 4, 'https://buy.stripe.com/00w5kEgBHdRz1gRgxx4gg0C', 'wanderer', 'physical', true),
  ('sticker', 'Sticker', 'A simple reminder that you''re part of something bigger. Remember you''re not alone in this story.', 'https://ik.imagekit.io/CHXNDLER/STORE/sticker.png', NULL, 3, 2, 'https://buy.stripe.com/8x24gA99f9Bj1gR6WX4gg0F', 'wanderer', 'physical', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  image_url_2 = EXCLUDED.image_url_2,
  cost_usd = EXCLUDED.cost_usd,
  price_heartcoins = EXCLUDED.price_heartcoins,
  stripe_url = EXCLUDED.stripe_url,
  min_tier = EXCLUDED.min_tier,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();