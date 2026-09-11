-- Optional per-brand graphic wordmark for the song title (e.g. a custom
-- lettering treatment of "WOW NO COW"), shown in the hero in place of the
-- plain typographic title when present. Falls back to the existing text
-- treatment when null, so this is purely additive and brand-optional.
alter table public.brand_pitches
  add column if not exists song_title_graphic_path text;
