create table if not exists public.music_video_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_video_projects(id) on delete cascade,
  recipient_email text not null,
  token_hash text not null unique,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.music_video_invites enable row level security;
revoke all on public.music_video_invites from anon, authenticated;
grant all on public.music_video_invites to service_role;
