-- Signal Signups table for anonymous phone number collection
-- Safe to run multiple times

begin;

-- Create table
create table if not exists public.signal_signups (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.signal_signups enable row level security;

-- Grant permissions for anonymous inserts
grant usage on schema public to anon;
grant insert on table public.signal_signups to anon;

-- Policy to allow anonymous inserts
drop policy if exists "Allow anonymous inserts" on public.signal_signups;
create policy "Allow anonymous inserts"
  on public.signal_signups
  for insert
  to anon
  with check (true);

commit;