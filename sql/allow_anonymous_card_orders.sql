-- Allow anonymous (unauthenticated) card orders by making user_id nullable.
-- Also ensures the email column exists for storing the customer's email.

-- 1. Make user_id nullable so anonymous orders can be stored without a profile
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add email column if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN email TEXT;
  END IF;
END $$;

-- 3. Add item_id column if it doesn't already exist (needed for NOT NULL insert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'item_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN item_id TEXT;
  END IF;
END $$;

-- 4. Allow service-role inserts without a user_id (anon card orders come via admin client)
DROP POLICY IF EXISTS "Allow anonymous card order inserts" ON public.orders;
CREATE POLICY "Allow anonymous card order inserts"
ON public.orders
FOR INSERT
TO service_role
WITH CHECK (true);
