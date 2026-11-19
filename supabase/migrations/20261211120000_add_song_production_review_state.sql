-- Default/legacy false milestone values are not proof that production status
-- has been reviewed. Keep this marker separate from release and promotion data.
alter table public.songs
  add column if not exists production_progress_verified boolean not null default false;
