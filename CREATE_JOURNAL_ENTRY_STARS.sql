-- Create journal_entry_stars table and toggle function for Soul Star Journal
-- This allows users to "star" public journal entries from other users

BEGIN;

-- Create the journal_entry_stars table
CREATE TABLE IF NOT EXISTS public.journal_entry_stars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.soul_journal_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Each user can only star an entry once
  UNIQUE(entry_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS journal_entry_stars_entry_id_idx
  ON public.journal_entry_stars (entry_id);

CREATE INDEX IF NOT EXISTS journal_entry_stars_user_id_idx
  ON public.journal_entry_stars (user_id);

-- Add stars_count column to soul_journal_entries if it doesn't exist
ALTER TABLE public.soul_journal_entries
ADD COLUMN IF NOT EXISTS stars_count integer DEFAULT 0;

-- Enable RLS on journal_entry_stars
ALTER TABLE public.journal_entry_stars ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journal_entry_stars
-- Users can view all stars (needed for counting)
CREATE POLICY "anyone_can_view_stars"
  ON public.journal_entry_stars FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own stars
CREATE POLICY "users_can_insert_own_stars"
  ON public.journal_entry_stars FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own stars
CREATE POLICY "users_can_delete_own_stars"
  ON public.journal_entry_stars FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create the toggle_journal_entry_star function
CREATE OR REPLACE FUNCTION public.toggle_journal_entry_star(p_entry_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_existing_star_id uuid;
  v_starred boolean;
  v_stars_count integer;
  v_entry_user_id uuid;
  v_is_public boolean;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify the entry exists and is public
  SELECT user_id, is_public
  INTO v_entry_user_id, v_is_public
  FROM soul_journal_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;

  IF v_is_public IS NOT TRUE THEN
    RAISE EXCEPTION 'Cannot star private entries';
  END IF;

  -- Check if user already starred this entry
  SELECT id INTO v_existing_star_id
  FROM journal_entry_stars
  WHERE entry_id = p_entry_id AND user_id = v_user_id;

  IF v_existing_star_id IS NOT NULL THEN
    -- Remove the star (unstar)
    DELETE FROM journal_entry_stars WHERE id = v_existing_star_id;
    v_starred := false;
  ELSE
    -- Add the star
    INSERT INTO journal_entry_stars (entry_id, user_id)
    VALUES (p_entry_id, v_user_id);
    v_starred := true;
  END IF;

  -- Count total stars for this entry
  SELECT COUNT(*)::integer INTO v_stars_count
  FROM journal_entry_stars
  WHERE entry_id = p_entry_id;

  -- Update the cached stars_count on the entry
  UPDATE soul_journal_entries
  SET stars_count = v_stars_count
  WHERE id = p_entry_id;

  -- Return the result
  RETURN json_build_object(
    'starred', v_starred,
    'stars_count', v_stars_count
  );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.toggle_journal_entry_star(uuid) TO authenticated;

-- Update RLS policy to allow viewing public entries (for the stars feature)
-- First, check if policy exists and drop it
DROP POLICY IF EXISTS "anyone_can_view_public_entries" ON public.soul_journal_entries;

-- Create policy to allow viewing public entries
CREATE POLICY "anyone_can_view_public_entries"
  ON public.soul_journal_entries FOR SELECT
  TO authenticated
  USING (is_public = true OR auth.uid() = user_id);

COMMIT;
