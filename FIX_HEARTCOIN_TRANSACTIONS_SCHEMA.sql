-- Fix heartcoin_transactions table to ensure description column exists
-- This addresses the missing 'description' column error

BEGIN;

-- First, create the table if it doesn't exist with the correct schema
CREATE TABLE IF NOT EXISTS public.heartcoin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'purchase', 'bonus', 'refund', 'transfer_in', 'transfer_out')),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add description column if it doesn't exist (in case table was created without it)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'heartcoin_transactions' 
        AND table_schema = 'public'
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.heartcoin_transactions ADD COLUMN description TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_heartcoin_transactions_user_id ON public.heartcoin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_heartcoin_transactions_created_at ON public.heartcoin_transactions(created_at);

-- Enable RLS
ALTER TABLE public.heartcoin_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own transactions" ON public.heartcoin_transactions;
DROP POLICY IF EXISTS "Service can insert transactions" ON public.heartcoin_transactions;

-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON public.heartcoin_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert transactions
CREATE POLICY "Service can insert transactions" ON public.heartcoin_transactions
    FOR INSERT WITH CHECK (true);

-- Add heartcoin columns to profiles table if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heartcoin_balance INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS heartcoin_total INTEGER DEFAULT 0 NOT NULL;

COMMIT;