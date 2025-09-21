-- Enable Row Level Security (RLS) on all analytics tables
-- Run this in your Supabase SQL Editor to secure your analytics data

-- Enable RLS on sessions table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on music_events table
ALTER TABLE public.music_events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on click_events table  
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ab_test_events table
ALTER TABLE public.ab_test_events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_flow_events table
ALTER TABLE public.user_flow_events ENABLE ROW LEVEL SECURITY;

-- Create policies for sessions table
CREATE POLICY "Allow insert sessions for anon users" 
ON public.sessions FOR INSERT TO anon 
WITH CHECK (true);

CREATE POLICY "Allow select sessions for authenticated users only" 
ON public.sessions FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Deny select sessions for anon users" 
ON public.sessions FOR SELECT TO anon 
USING (false);

-- Create policies for music_events
CREATE POLICY "Allow insert music events for anon users" 
ON public.music_events FOR INSERT TO anon 
WITH CHECK (true);

CREATE POLICY "Allow select music events for authenticated users only" 
ON public.music_events FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Deny select music events for anon users" 
ON public.music_events FOR SELECT TO anon 
USING (false);

-- Create policies for click_events
CREATE POLICY "Allow insert click events for anon users" 
ON public.click_events FOR INSERT TO anon 
WITH CHECK (true);

CREATE POLICY "Allow select click events for authenticated users only" 
ON public.click_events FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Deny select click events for anon users" 
ON public.click_events FOR SELECT TO anon 
USING (false);

-- Create policies for ab_test_events
CREATE POLICY "Allow insert ab test events for anon users" 
ON public.ab_test_events FOR INSERT TO anon 
WITH CHECK (true);

CREATE POLICY "Allow select ab test events for authenticated users only" 
ON public.ab_test_events FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Deny select ab test events for anon users" 
ON public.ab_test_events FOR SELECT TO anon 
USING (false);

-- Create policies for user_flow_events
CREATE POLICY "Allow insert user flow events for anon users" 
ON public.user_flow_events FOR INSERT TO anon 
WITH CHECK (true);

CREATE POLICY "Allow select user flow events for authenticated users only" 
ON public.user_flow_events FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Deny select user flow events for anon users" 
ON public.user_flow_events FOR SELECT TO anon 
USING (false);

-- Optional: Create a service role for admin access
-- This allows your backend to read analytics data with the service role key
CREATE POLICY "Allow all operations for service role on sessions" 
ON public.sessions FOR ALL TO service_role 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for service role" 
ON public.music_events FOR ALL TO service_role 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for service role on clicks" 
ON public.click_events FOR ALL TO service_role 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for service role on ab tests" 
ON public.ab_test_events FOR ALL TO service_role 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for service role on user flows" 
ON public.user_flow_events FOR ALL TO service_role 
USING (true) WITH CHECK (true);