-- Add optional title column used in UI (human-friendly event title)
alter table if exists public.irl_shows
  add column if not exists title text;

