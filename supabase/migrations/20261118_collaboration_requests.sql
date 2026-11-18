create extension if not exists pgcrypto;
alter table public.songs add column if not exists collaboration_enabled boolean not null default false;

create table if not exists public.collaboration_terms (
  version text primary key,
  terms jsonb not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.collaboration_terms (version, terms, active) values
('2026-11-18-v1', '{"ownership":"You retain rights to your original creative contribution, subject to the final signed agreement. Master recording and composition ownership are addressed separately.","royalties":"Master royalties and songwriting/publishing royalties are separate. Applicable splits and compensation will be agreed in writing before work begins.","credits":"Your agreed artist, songwriter, and/or producer credits will be included in the official release metadata.","release_rights":"CHXNDLER coordinates official releases and distribution. No independent upload, release, remix, or commercial use without the required written authorization."}', true)
on conflict (version) do nothing;

create table if not exists public.collaboration_invites (
  id uuid primary key default gen_random_uuid(),
  submission_key uuid not null unique default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists collaboration_invites_song_id_idx on public.collaboration_invites(song_id);

create table if not exists public.collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete restrict,
  artist_name text not null check (length(artist_name) between 1 and 120),
  email text not null check (length(email) <= 320),
  profile_link text,
  phone text,
  contribution_type text not null check (contribution_type in ('Vocals / Feature','Production / Remix','Songwriting','Other')),
  message text check (length(message) <= 1200),
  status text not null default 'new' check (status in ('new','reviewing','approved','declined','agreement_pending','signed','in_progress','completed','canceled','archived')),
  terms_version text not null references public.collaboration_terms(version),
  acknowledged_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  internal_notes text not null default '',
  admin_legal_name text,
  artist_credit text,
  master_royalty numeric(5,2) check (master_royalty between 0 and 100),
  publishing_royalty numeric(5,2) check (publishing_royalty between 0 and 100),
  flat_fee numeric(12,2) check (flat_fee >= 0),
  agreement_terms jsonb not null default '{}'::jsonb,
  agreement_status text not null default 'not_started' check (agreement_status in ('not_started','pending','sent','signed')),
  agreement_path text,
  signed_at timestamptz,
  project_status text not null default 'requested',
  email_admin_status text not null default 'pending',
  email_admin_id text,
  email_artist_status text not null default 'pending',
  email_artist_id text,
  email_error text,
  last_email_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists collaboration_requests_status_submitted_idx on public.collaboration_requests(status, submitted_at desc);
create index if not exists collaboration_requests_song_id_idx on public.collaboration_requests(song_id);

create table if not exists public.collaboration_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.collaboration_requests(id) on delete cascade,
  event text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.collaboration_terms enable row level security;
alter table public.collaboration_invites enable row level security;
alter table public.collaboration_requests enable row level security;
alter table public.collaboration_request_events enable row level security;
revoke all on public.collaboration_terms, public.collaboration_invites, public.collaboration_requests, public.collaboration_request_events from anon, authenticated;
grant all on public.collaboration_terms, public.collaboration_invites, public.collaboration_requests, public.collaboration_request_events to service_role;
