alter table public.songs
  add column if not exists meaning text not null default '',
  add column if not exists category text not null default '',
  add column if not exists submit_hub text not null default '',
  add column if not exists genre text not null default '',
  add column if not exists sub_genre text not null default '',
  add column if not exists sub_genre_2 text not null default '',
  add column if not exists lyrics text not null default '',
  add column if not exists bpm integer,
  add column if not exists musical_key text not null default '';

alter table public.songs drop constraint if exists songs_bpm_check;
alter table public.songs add constraint songs_bpm_check check (bpm is null or bpm between 1 and 400);

-- These nine deliverables are tracked per song in the existing JSON progress field.
update public.songs
set production_stages = coalesce(production_stages, '{}'::jsonb) ||
  '{"write":false,"record":false,"cover_art":false,"spotify_canvas":false,"sky":false,"chxndler_card":false,"karaoke":false,"mix":false,"music_video":false}'::jsonb;
