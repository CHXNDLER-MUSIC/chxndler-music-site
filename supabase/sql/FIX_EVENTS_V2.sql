-- FIX_EVENTS_V2.sql
-- Bring events_v2 in line with the analytics client expectations.

-- 1) If a legacy "event" column exists, rename it to "event_name"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'events_v2'
      AND column_name  = 'event'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'events_v2'
      AND column_name  = 'event_name'
  ) THEN
    ALTER TABLE public.events_v2
      RENAME COLUMN event TO event_name;
  END IF;
END
$$;

-- 2) Ensure the table exists with the expected shape
CREATE TABLE IF NOT EXISTS public.events_v2 (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_name text NOT NULL CHECK (char_length(event_name) <= 100),
  source     text NOT NULL DEFAULT 'unknown' CHECK (char_length(source) <= 100),
  metadata   jsonb,
  created_at timestamptz DEFAULT now()
);

-- 3) Backfill any missing columns on older tables in a safe, idempotent way
ALTER TABLE public.events_v2
  ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS source     text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS metadata   jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 4) Indexes to keep queries happy
CREATE INDEX IF NOT EXISTS events_v2_event_name_idx  ON public.events_v2(event_name);
CREATE INDEX IF NOT EXISTS events_v2_user_id_idx     ON public.events_v2(user_id);
CREATE INDEX IF NOT EXISTS events_v2_created_at_idx  ON public.events_v2(created_at);

-- 5) Row level security and anon policies
ALTER TABLE public.events_v2 ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'events_v2'
      AND policyname = 'Anon insert OK'
  ) THEN
    CREATE POLICY "Anon insert OK"
      ON public.events_v2
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'events_v2'
      AND policyname = 'Anon read OK'
  ) THEN
    CREATE POLICY "Anon read OK"
      ON public.events_v2
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END
$$;

-- 6) Refresh PostgREST schema cache so the client sees the new columns
SELECT pg_notify('pgrst', 'reload schema');
