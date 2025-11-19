-- Profiles table and RLS policies
-- Safe to run multiple times

begin;

-- Create table
create table if not exists public.profiles (
  id uuid primary key default auth.uid(),
  display_name text,
  avatar_url text,
  phone text,
  hearts integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backfill: older deployments may not have the hearts and phone columns yet
alter table public.profiles add column if not exists hearts integer not null default 0;
alter table public.profiles add column if not exists phone text;

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Ensure authenticated can access (RLS still enforced)
grant usage on schema public to authenticated;
grant select, update on table public.profiles to authenticated;

-- Policies (re-create to ensure idempotency)
drop policy if exists "Authenticated users can select their own profile" on public.profiles;
drop policy if exists "Authenticated users can update their own profile" on public.profiles;

create policy "Authenticated users can select their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Authenticated users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

commit;
