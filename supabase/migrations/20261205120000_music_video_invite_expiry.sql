-- Keep project-specific videographer links time limited and revocable.
alter table public.music_video_invites
  add column if not exists expires_at timestamptz;

create index if not exists music_video_invites_active_project_idx
  on public.music_video_invites(project_id, expires_at)
  where revoked_at is null;
