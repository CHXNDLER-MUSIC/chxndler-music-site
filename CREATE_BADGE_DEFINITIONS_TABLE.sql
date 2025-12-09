-- Create badge_definitions table for normalized badge requirements
-- Safe to run multiple times

begin;

-- Create badge_definitions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  requirement_type text NOT NULL,
  requirement_count integer NOT NULL DEFAULT 1,
  icon text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_badge_definitions_slug ON public.badge_definitions(slug);
CREATE INDEX IF NOT EXISTS idx_badge_definitions_category ON public.badge_definitions(category);
CREATE INDEX IF NOT EXISTS idx_badge_definitions_requirement_type ON public.badge_definitions(requirement_type);

-- Enable Row Level Security
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read badge definitions (public data)
GRANT SELECT ON TABLE public.badge_definitions TO authenticated;

-- Policy for reading badge definitions (all authenticated users can read)
DROP POLICY IF EXISTS "Authenticated users can read badge definitions" ON public.badge_definitions;
CREATE POLICY "Authenticated users can read badge definitions"
  ON public.badge_definitions
  FOR SELECT
  TO authenticated
  USING (true);

commit;