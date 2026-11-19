alter table public.collaboration_invites
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists artist_name text,
  add column if not exists phone text;
