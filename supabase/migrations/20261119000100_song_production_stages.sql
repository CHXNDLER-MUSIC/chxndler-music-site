alter table public.songs
  add column if not exists production_stages jsonb not null default '{"concept":false,"lyrics":false,"recorded":false,"mix":false,"mastered":false,"released":false,"music_video":false}'::jsonb;
