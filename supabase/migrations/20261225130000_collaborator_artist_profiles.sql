create table if not exists public.collaborator_artist_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_key text not null unique,
  legal_name text not null default '',
  artist_name text not null default '',
  has_streaming_profiles boolean,
  spotify_artist_uri text,
  apple_music_artist_url text,
  youtube_music_artist_channel_id text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.collaborator_artist_profiles enable row level security;
revoke all on public.collaborator_artist_profiles from anon, authenticated;
grant all on public.collaborator_artist_profiles to service_role;
