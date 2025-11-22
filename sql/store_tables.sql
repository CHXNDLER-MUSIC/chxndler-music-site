-- SQL to create tables required for the store functionality
-- Run this in your Supabase SQL editor if these tables don't already exist

-- Table to store HeartCoin transactions
CREATE TABLE IF NOT EXISTS heartcoin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive for earning, negative for spending
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'purchase', 'bonus', 'refund')),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- Additional data like item_id, quest_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store user's owned items (cards, etc.)
CREATE TABLE IF NOT EXISTS user_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL, -- Identifier for the item (e.g., song slug)
    item_name TEXT NOT NULL, -- Display name
    item_type TEXT NOT NULL DEFAULT 'card' CHECK (item_type IN ('card', 'digital', 'physical', 'nft')),
    acquisition_method TEXT NOT NULL CHECK (acquisition_method IN ('heartcoin_purchase', 'stripe_purchase', 'quest_reward', 'airdrop', 'gift')),
    acquisition_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}', -- Additional item-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate items per user
    UNIQUE(user_id, item_id)
);

-- Table to log purchase attempts for analytics
CREATE TABLE IF NOT EXISTS purchase_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    item_id TEXT NOT NULL,
    item_title TEXT NOT NULL,
    price_usd DECIMAL,
    price_heartcoins INTEGER,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'heartcoins')),
    stripe_url TEXT,
    status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add heartcoin_balance column to profiles if it doesn't exist
-- (This might already exist in your profiles table)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'heartcoin_balance'
    ) THEN
        ALTER TABLE profiles ADD COLUMN heartcoin_balance INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_heartcoin_transactions_user_id ON heartcoin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_heartcoin_transactions_created_at ON heartcoin_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_items_item_id ON user_items(item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_attempts_user_id ON purchase_attempts(user_id);

-- RLS (Row Level Security) policies
ALTER TABLE heartcoin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON heartcoin_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own items
CREATE POLICY "Users can view own items" ON user_items
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own purchase attempts
CREATE POLICY "Users can view own purchase attempts" ON purchase_attempts
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert purchase attempts
CREATE POLICY "Service can insert purchase attempts" ON purchase_attempts
    FOR INSERT WITH CHECK (true);