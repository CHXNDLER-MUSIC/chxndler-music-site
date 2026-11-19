alter table public.songs
  add column if not exists release_date date;
