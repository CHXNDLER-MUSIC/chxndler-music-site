-- Allow anon guest inserts into heart_signal_messages for logged-out users
-- Preconditions: guest support migration added guest_id and made user_id nullable.

-- Ensure RLS is enabled
alter table public.heart_signal_messages enable row level security;

-- Create or replace anon insert policy for guest messages only
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'heart_signal_messages'
      and policyname = 'anon insert guest heart signal messages'
  ) then
    create policy "anon insert guest heart signal messages"
    on public.heart_signal_messages
    for insert
    to anon
    with check (
      -- must be a guest insert (no authenticated user attribution)
      user_id is null
      -- require non-empty username and message to reduce spam/empties
      and coalesce(username, '') <> ''
      and coalesce(message, '') <> ''
      -- guests may not mark messages as system
      and coalesce(is_system, false) = false
    );
  end if;
end $$;

