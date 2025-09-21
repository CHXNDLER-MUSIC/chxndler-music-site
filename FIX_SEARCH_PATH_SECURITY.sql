-- Fix search_path security issue for touch_session functions
-- Run this in your Supabase SQL Editor

-- Drop the existing functions with mutable search_path
DROP FUNCTION IF EXISTS analytics.touch_session(uuid, text, text);
DROP FUNCTION IF EXISTS public.touch_session(uuid, text, text);

-- Recreate the function with a secure, fixed search_path
CREATE OR REPLACE FUNCTION analytics.touch_session(p_session_id uuid, p_user_agent text, p_ip_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, public  -- Fixed search_path for security
AS $$
BEGIN
  INSERT INTO analytics.sessions (session_id, user_agent, ip_hash)
  VALUES (p_session_id, p_user_agent, p_ip_hash)
  ON CONFLICT (session_id) DO UPDATE
    SET last_seen = now(),
        user_agent = COALESCE(EXCLUDED.user_agent, analytics.sessions.user_agent),
        ip_hash = COALESCE(EXCLUDED.ip_hash, analytics.sessions.ip_hash);
END;
$$;

-- Create the same function in public schema if needed (with secure search_path)
CREATE OR REPLACE FUNCTION public.touch_session(p_session_id uuid, p_user_agent text, p_ip_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, analytics  -- Fixed search_path for security
AS $$
BEGIN
  -- Try to insert/update in public.sessions first, fallback to analytics.sessions
  BEGIN
    INSERT INTO public.sessions (session_id, user_agent, ip_hash)
    VALUES (p_session_id, p_user_agent, p_ip_hash)
    ON CONFLICT (session_id) DO UPDATE
      SET last_seen = now(),
          user_agent = COALESCE(EXCLUDED.user_agent, public.sessions.user_agent),
          ip_hash = COALESCE(EXCLUDED.ip_hash, public.sessions.ip_hash);
  EXCEPTION WHEN undefined_table THEN
    -- If public.sessions doesn't exist, use analytics.sessions
    INSERT INTO analytics.sessions (session_id, user_agent, ip_hash)
    VALUES (p_session_id, p_user_agent, p_ip_hash)
    ON CONFLICT (session_id) DO UPDATE
      SET last_seen = now(),
          user_agent = COALESCE(EXCLUDED.user_agent, analytics.sessions.user_agent),
          ip_hash = COALESCE(EXCLUDED.ip_hash, analytics.sessions.ip_hash);
  END;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION analytics.touch_session(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION analytics.touch_session(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_session(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.touch_session(uuid, text, text) TO authenticated;

-- Optional: Create any other analytics functions with secure search_path
-- Example secure function for getting session stats
CREATE OR REPLACE FUNCTION analytics.get_session_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, public  -- Always set search_path for security
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM analytics.sessions);
END;
$$;

-- Grant permissions for the new function
GRANT EXECUTE ON FUNCTION analytics.get_session_count() TO authenticated;