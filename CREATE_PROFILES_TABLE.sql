-- Profiles table and RLS policies
-- Safe to run multiple times

begin;

-- Create table
create table if not exists public.profiles (
  id uuid primary key default auth.uid(),
  email text,
  phone text,
  display_name text,
  avatar_url text,
  selected_element text, -- heart, water, lightning, darkness
  journey_tag text,      -- wanderer, dreamer, lover
  heartcoin_balance integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backfill: older deployments may not have the new columns yet
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists selected_element text;
alter table public.profiles add column if not exists journey_tag text;
alter table public.profiles add column if not exists heartcoin_balance integer not null default 0;
-- Migrate existing hearts column to heartcoin_balance if needed
update public.profiles set heartcoin_balance = hearts where heartcoin_balance = 0 and hearts > 0;
alter table public.profiles drop column if exists hearts;

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Ensure authenticated can access (RLS still enforced)
grant usage on schema public to authenticated;
grant select, insert, update on table public.profiles to authenticated;

-- Policies (re-create to ensure idempotency)
drop policy if exists "Authenticated users can select their own profile" on public.profiles;
drop policy if exists "Authenticated users can update their own profile" on public.profiles;
drop policy if exists "Authenticated users can insert their own profile" on public.profiles;

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

create policy "Authenticated users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

commit;
