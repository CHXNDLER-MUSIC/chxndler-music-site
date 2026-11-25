-- Keep structured concept fields aligned with the Visual style and Mood controls.
alter table public.music_video_concepts
  add column if not exists visual_style text[] not null default '{}',
  add column if not exists mood text[] not null default '{}';
