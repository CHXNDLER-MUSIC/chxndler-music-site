-- Heart Signal Messages RLS Policies
-- Allow anon and authenticated users to SELECT (read) messages
-- INSERT only allowed via service role (API route)

-- Enable RLS if not already enabled
alter table public.heart_signal_messages enable row level security;

-- Drop existing policies to recreate them
drop policy if exists "read heart signal messages" on public.heart_signal_messages;
drop policy if exists "anon read heart signal messages" on public.heart_signal_messages;
drop policy if exists "public read heart signal messages" on public.heart_signal_messages;
drop policy if exists "insert own heart signal messages" on public.heart_signal_messages;

-- Create SELECT policy for both anon and authenticated users
-- This allows realtime subscriptions to work for all users
create policy "public read heart signal messages"
on public.heart_signal_messages
for select
to anon, authenticated
using (true);

-- No INSERT policy for anon - all inserts go through API with service role
-- Authenticated users also use API, but keep policy for backwards compatibility if needed
create policy "authenticated insert heart signal messages"
on public.heart_signal_messages
for insert
to authenticated
with check (auth.uid() = user_id);

-- Keep UPDATE and DELETE policies for authenticated users (for reactions, etc.)
drop policy if exists "update own heart signal messages" on public.heart_signal_messages;
create policy "update own heart signal messages"
on public.heart_signal_messages
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own heart signal messages" on public.heart_signal_messages;
create policy "delete own heart signal messages"
on public.heart_signal_messages
for delete
to authenticated
using (auth.uid() = user_id);
