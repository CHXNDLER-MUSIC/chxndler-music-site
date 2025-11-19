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

-- Profiles table for Join Us functionality
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  phone text,
  email text,
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

-- Prevent anonymous users from reading profiles (privacy)
create policy "deny_select_profiles_anon"
  on profiles for select to anon using (false);