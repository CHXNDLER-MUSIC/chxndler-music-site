-- Add category field to badges table
-- Safe to run multiple times

begin;

-- Add category column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'badges' 
    AND column_name = 'category'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.badges ADD COLUMN category text;
  END IF;
END $$;

commit;