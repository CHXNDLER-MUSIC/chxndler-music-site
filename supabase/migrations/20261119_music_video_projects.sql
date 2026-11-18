-- Add a private, song-linked workspace for music video production.
-- Public fields are deliberately separate from the private workspace payload.
create table if not exists public.music_video_projects (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete restrict,
  project_type text not null default 'primary' check (project_type in ('primary','alternate')),
  visibility text not null default 'hidden' check (visibility in ('public','invite_only','hidden')),
  status text not null default 'concept' check (status in ('concept','planning','agreement','filming','editing','delivered','complete')),
  public_concept text not null default '',
  public_status text not null default 'Seeking Videographer',
  workspace jsonb not null default '{"creative":{},"production":{},"collaboration":{}}'::jsonb,
  next_action text not null default 'Develop the creative brief',
  assigned_videographer jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(song_id, project_type)
);
create index if not exists music_video_projects_public_idx on public.music_video_projects(visibility, status) where visibility = 'public';
create index if not exists music_video_projects_song_idx on public.music_video_projects(song_id);
alter table public.music_video_projects enable row level security;
-- All access is mediated by server routes. Public routes select the explicit public projection only.
revoke all on public.music_video_projects from anon, authenticated;
grant all on public.music_video_projects to service_role;

alter table public.collaboration_requests drop constraint if exists collaboration_requests_contribution_type_check;
alter table public.collaboration_requests add constraint collaboration_requests_contribution_type_check
  check (contribution_type in ('Vocals / Feature','Production / Remix','Songwriting','Other','Music Video'));
alter table public.collaboration_requests add column if not exists portfolio_url text;
alter table public.collaboration_requests add column if not exists estimated_rate text;
alter table public.collaboration_requests add column if not exists music_video_project_id uuid references public.music_video_projects(id) on delete set null;
create index if not exists collaboration_requests_music_video_idx on public.collaboration_requests(music_video_project_id, submitted_at desc);
