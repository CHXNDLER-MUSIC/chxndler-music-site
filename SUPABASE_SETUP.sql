create schema if not exists analytics;

create table if not exists analytics.sessions (
  session_id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  user_agent text,
  ip_hash text
);

create table if not exists analytics.events (
  id bigserial primary key,
  happened_at timestamptz not null default now(),
  session_id uuid not null,
  event_type text not null check (length(event_type) <= 64),
  page text,
  referrer text,
  song_slug text,
  payload jsonb,
  constraint fk_session
    foreign key (session_id) references analytics.sessions(session_id) on delete cascade
);

create table if not exists analytics.songs (
  slug text primary key,
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_happened_at on analytics.events (happened_at desc);
create index if not exists idx_events_session on analytics.events (session_id);
create index if not exists idx_events_event_type on analytics.events (event_type);
create index if not exists idx_events_song_slug on analytics.events (song_slug);

alter table analytics.sessions enable row level security;
alter table analytics.events enable row level security;

create policy "allow_insert_sessions_anon"
  on analytics.sessions for insert to anon with check (true);
create policy "deny_select_sessions_anon"
  on analytics.sessions for select to anon using (false);

create policy "allow_insert_events_anon"
  on analytics.events for insert to anon with check (true);
create policy "deny_select_events_anon"
  on analytics.events for select to anon using (false);

create or replace function analytics.touch_session(p_session_id uuid, p_user_agent text, p_ip_hash text)
returns void
language plpgsql
security definer
as $$
begin
  insert into analytics.sessions (session_id, user_agent, ip_hash)
  values (p_session_id, p_user_agent, p_ip_hash)
  on conflict (session_id) do update
    set last_seen = now(),
        user_agent = coalesce(excluded.user_agent, analytics.sessions.user_agent),
        ip_hash = coalesce(excluded.ip_hash, analytics.sessions.ip_hash);
end;
$$;

create or replace view analytics.v_events_7d as
select *
from analytics.events
where happened_at >= now() - interval '7 days';

-- Enable UUID extension for profiles table
create extension if not exists "uuid-ossp";

-- Profiles table for Join Us functionality
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  phone text,
  email text,
  name text,
  element text check (element in ('fire', 'water', 'earth', 'air', 'space')),
  journey text check (journey in ('wanderer', 'dreamer', 'lover')) default 'wanderer',
  heart_coins_current integer default 0,
  heart_coins_total integer default 0,
  profile_complete boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb,
  constraint unique_phone unique (phone),
  constraint unique_email unique (email)
);

create index if not exists idx_profiles_phone on profiles (phone);
create index if not exists idx_profiles_email on profiles (email);
create index if not exists idx_profiles_created_at on profiles (created_at desc);

-- Enable RLS for profiles
alter table profiles enable row level security;

-- Allow anonymous users to insert profiles (for sign-ups)
create policy "allow_insert_profiles_anon"
  on profiles for insert to anon with check (true);

-- Allow anonymous users to update their own profiles (for profile completion)
create policy "allow_update_profiles_anon"
  on profiles for update to anon using (true) with check (true);

-- Allow anonymous users to read profiles for duplicate checking
create policy "allow_select_profiles_anon"
  on profiles for select to anon using (true);

-- Migration: Add new columns to existing profiles table
alter table profiles 
add column if not exists journey text check (journey in ('wanderer', 'dreamer', 'lover')) default 'wanderer',
add column if not exists heart_coins_current integer default 0,
add column if not exists heart_coins_total integer default 0;

-- Migrate existing hearts column to new structure
update profiles 
set heart_coins_current = coalesce(hearts, 0),
    heart_coins_total = coalesce(hearts, 0)
where hearts is not null;

-- Create indexes for journey and heart coins
create index if not exists idx_profiles_journey on profiles (journey);
create index if not exists idx_profiles_heart_coins_total on profiles (heart_coins_total desc);

-- Function to update journey based on heart coins
create or replace function update_profile_journey()
returns trigger
language plpgsql
as $$
begin
  -- Update journey based on heart_coins_total
  if NEW.heart_coins_total >= 25 then
    NEW.journey = 'lover';
  elsif NEW.heart_coins_total >= 5 then
    NEW.journey = 'dreamer';
  else
    NEW.journey = 'wanderer';
  end if;
  
  NEW.updated_at = now();
  
  return NEW;
end;
$$;

-- Trigger to automatically update journey when heart_coins_total changes
drop trigger if exists trigger_update_journey on profiles;
create trigger trigger_update_journey
  before update of heart_coins_total on profiles
  for each row
  execute function update_profile_journey();

-- Journal entries table for daily journaling
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  intention text,
  reflection text,
  soul_star text,
  created_at timestamptz not null default now()
);

create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, entry_date);

-- Enable RLS for journal_entries
alter table public.journal_entries enable row level security;

-- Allow authenticated users to manage their own journal entries
create policy "allow_journal_entries_authenticated"
  on public.journal_entries for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow anonymous users to manage their own journal entries (for our auth-less setup)
create policy "allow_journal_entries_anon"
  on public.journal_entries for all to anon
  using (true)
  with check (true);

-- Events v2 table for simplified analytics tracking
create table if not exists public.events_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  event_name text not null check (length(event_name) <= 100),
  source text not null default 'unknown' check (length(source) <= 100),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_v2_event_name on public.events_v2 (event_name);
create index if not exists idx_events_v2_source on public.events_v2 (source);
create index if not exists idx_events_v2_created_at on public.events_v2 (created_at desc);
create index if not exists idx_events_v2_user_id on public.events_v2 (user_id);

-- Enable RLS for events_v2
alter table public.events_v2 enable row level security;

-- Allow anonymous users to insert events (for tracking)
create policy "allow_insert_events_v2_anon"
  on public.events_v2 for insert to anon with check (true);

-- Allow anonymous users to read aggregated events data (for analytics modal)
create policy "allow_select_events_v2_anon"
  on public.events_v2 for select to anon using (true);