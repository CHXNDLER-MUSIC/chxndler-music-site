-- Create analytics tables and functions in public schema
-- This will work with the existing API route

-- Sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  session_id uuid PRIMARY KEY,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_hash text
);

-- Events table 
CREATE TABLE IF NOT EXISTS public.events (
  id bigserial PRIMARY KEY,
  happened_at timestamptz NOT NULL DEFAULT now(),
  session_id uuid NOT NULL,
  event_type text NOT NULL CHECK (length(event_type) <= 64),
  page text,
  referrer text,
  song_slug text,
  payload jsonb,
  user_agent text,
  ip_hash text,
  CONSTRAINT fk_session
    FOREIGN KEY (session_id) REFERENCES public.sessions(session_id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_happened_at ON public.events (happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON public.events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_song_slug ON public.events (song_slug);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies to allow anonymous inserts but deny selects
CREATE POLICY IF NOT EXISTS "allow_insert_sessions_anon"
  ON public.sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "deny_select_sessions_anon"
  ON public.sessions FOR SELECT TO anon USING (false);

CREATE POLICY IF NOT EXISTS "allow_insert_events_anon"
  ON public.events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "deny_select_events_anon"
  ON public.events FOR SELECT TO anon USING (false);

-- Touch session function
CREATE OR REPLACE FUNCTION public.touch_session(p_session_id uuid, p_user_agent text, p_ip_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.sessions (session_id, user_agent, ip_hash)
  VALUES (p_session_id, p_user_agent, p_ip_hash)
  ON CONFLICT (session_id) DO UPDATE
    SET last_seen = now(),
        user_agent = COALESCE(EXCLUDED.user_agent, public.sessions.user_agent),
        ip_hash = COALESCE(EXCLUDED.ip_hash, public.sessions.ip_hash);
END;
$$;