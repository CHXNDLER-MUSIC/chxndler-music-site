alter table public.songs
  add column if not exists capo_fret integer,
  add column if not exists chord_shape text;

alter table public.songs
  add constraint songs_capo_fret_range
  check (capo_fret is null or capo_fret between 0 and 24);
