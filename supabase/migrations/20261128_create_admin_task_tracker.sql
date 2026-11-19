create table if not exists public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  business_area text not null check (business_area in ('chxndler_studio','chxndler','unreleased_song')),
  song_id uuid references public.songs(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 180),
  description text not null default '',
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  due_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_tasks_song_scope_check check (
    (business_area = 'unreleased_song' and song_id is not null) or
    (business_area <> 'unreleased_song' and song_id is null)
  )
);
create unique index if not exists admin_tasks_song_profile_task_idx
  on public.admin_tasks(song_id, title) where song_id is not null;
create index if not exists admin_tasks_area_status_idx on public.admin_tasks(business_area, status, due_at);
alter table public.admin_tasks enable row level security;
revoke all on public.admin_tasks from anon, authenticated;
grant all on public.admin_tasks to service_role;

-- Each existing unreleased song gets one persistent profile task, linked back
-- to that song's existing record. This does not create or duplicate songs.
insert into public.admin_tasks (business_area, song_id, title, description)
select 'unreleased_song', s.id, 'Complete song profile', 'Develop this song’s profile, meaning, lyrics, and music video workspace.'
from public.songs s
where coalesce(s.is_released, false) = false and s.slug is not null
on conflict (song_id, title) where song_id is not null do nothing;
