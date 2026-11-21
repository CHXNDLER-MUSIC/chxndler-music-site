-- Structured production planning for the existing primary music video project.
-- This migration does not create projects or modify existing production data.
-- Project deletion is restricted so scene/task records cannot cascade from a song.

create table if not exists public.music_video_concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_video_projects(id) on delete restrict,
  title text not null default 'Concept',
  story text not null default '',
  theme text not null default '',
  aesthetic text not null default '',
  director_notes text not null default '',
  creative_references jsonb not null default '[]'::jsonb,
  source_notes jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_selected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists music_video_one_selected_concept_idx
  on public.music_video_concepts(project_id) where is_selected;
create index if not exists music_video_concepts_project_order_idx
  on public.music_video_concepts(project_id, sort_order, id);
create unique index if not exists music_video_concepts_project_title_idx
  on public.music_video_concepts(project_id, lower(title));

create table if not exists public.music_video_scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_video_projects(id) on delete restrict,
  concept_id uuid references public.music_video_concepts(id) on delete restrict,
  scene_number integer not null,
  title text not null default '',
  description text not null default '',
  location text not null default '',
  characters jsonb not null default '[]'::jsonb,
  song_section text not null default '' check (song_section in ('','Intro','Verse','Chorus','Bridge','Outro')),
  sort_order integer not null default 0,
  source_notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists music_video_scenes_project_order_idx on public.music_video_scenes(project_id, concept_id, sort_order);

create table if not exists public.music_video_shots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_video_projects(id) on delete restrict,
  scene_id uuid references public.music_video_scenes(id) on delete restrict,
  description text not null default '',
  reference_url text,
  status text not null default 'planned' check (status in ('planned','filmed')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists music_video_shots_scene_order_idx on public.music_video_shots(scene_id, sort_order);
create index if not exists music_video_shots_project_idx on public.music_video_shots(project_id, status);

create table if not exists public.music_video_production_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_video_projects(id) on delete restrict,
  name text not null,
  category text,
  status text not null default 'To Do' check (status in ('To Do','In Progress','Done')),
  due_date date,
  assignee text,
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists music_video_tasks_project_order_idx on public.music_video_production_tasks(project_id, sort_order);

create table if not exists public.music_video_people (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_video_projects(id) on delete restrict,
  person_type text not null check (person_type in ('actor','location','outfit','videographer')),
  name text not null default '',
  details jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists music_video_people_project_type_idx on public.music_video_people(project_id, person_type, sort_order);

alter table public.music_video_projects
  add column if not exists readiness jsonb not null default '{"story":"not_started","actors":"not_started","locations":"not_started","outfits":"not_started","videographer":"not_started"}'::jsonb;
alter table public.music_video_projects drop constraint if exists music_video_readiness_values_check;
alter table public.music_video_projects add constraint music_video_readiness_values_check check (
  readiness ?& array['story','actors','locations','outfits','videographer']
  and readiness->>'story' in ('not_started','in_progress','ready')
  and readiness->>'actors' in ('not_started','in_progress','ready')
  and readiness->>'locations' in ('not_started','in_progress','ready')
  and readiness->>'outfits' in ('not_started','in_progress','ready')
  and readiness->>'videographer' in ('not_started','in_progress','ready')
);

do $$ declare t text; begin
  foreach t in array array['music_video_concepts','music_video_scenes','music_video_shots','music_video_production_tasks','music_video_people'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
