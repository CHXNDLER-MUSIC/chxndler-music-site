-- Fix heartcoin column name in profiles table
-- This will rename heartcoins_balance to heartcoin_balance if it exists

DO $$
BEGIN
    -- Check if the incorrect column exists and rename it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'heartcoins_balance'
        AND table_schema = 'public'
    ) THEN
        -- Rename the incorrect column
        ALTER TABLE public.profiles RENAME COLUMN heartcoins_balance TO heartcoin_balance;
        RAISE NOTICE 'Renamed heartcoins_balance to heartcoin_balance';
    ELSE
        -- Check if the correct column exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'heartcoin_balance'
            AND table_schema = 'public'
        ) THEN
            RAISE NOTICE 'Column heartcoin_balance already exists correctly';
        ELSE
            -- Create the correct column if neither exists
            ALTER TABLE public.profiles ADD COLUMN heartcoin_balance INTEGER DEFAULT 0 NOT NULL;
            RAISE NOTICE 'Created heartcoin_balance column';
        END IF;
    END IF;
END
$$;