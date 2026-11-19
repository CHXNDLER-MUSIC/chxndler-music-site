-- Song linked short form content planning. Access is mediated by admin routes.
create table if not exists public.song_content_items (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 180),
  content_type text not null default 'Short-form video',
  platforms text[] not null default '{}',
  status text not null default 'Idea' check (status in ('Idea','Creating','Ready','Published','Archived','Cancelled')),
  planned_publish_date date,
  media_url text not null default '',
  caption_notes text not null default '',
  published_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists song_content_items_song_date_idx on public.song_content_items(song_id, planned_publish_date, created_at);
alter table public.song_content_items enable row level security;
revoke all on public.song_content_items from anon, authenticated;
grant all on public.song_content_items to service_role;

alter table public.admin_tasks add column if not exists content_item_id uuid references public.song_content_items(id) on delete set null;
create index if not exists admin_tasks_content_item_idx on public.admin_tasks(content_item_id) where content_item_id is not null;
