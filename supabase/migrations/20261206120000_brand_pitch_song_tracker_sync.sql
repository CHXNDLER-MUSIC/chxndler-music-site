-- Keep songs featured in CHXNDLER Studio connected to the canonical song
-- tracker. Studio projects remain in brand_pitches; this creates a matching
-- tracker record only when one does not already exist.
create or replace function public.sync_brand_pitch_song_to_tracker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_title text;
  clean_slug text;
begin
  clean_title := btrim(coalesce(new.song_title, ''));
  if clean_title = '' then
    return new;
  end if;

  if exists (
    select 1 from public.songs s
    where lower(btrim(s.title)) = lower(clean_title)
  ) then
    return new;
  end if;

  clean_slug := trim(both '-' from regexp_replace(lower(clean_title), '[^a-z0-9]+', '-', 'g'));
  if clean_slug = '' then
    clean_slug := 'studio-song-' || new.id::text;
  end if;

  insert into public.songs (title, slug, is_released, collaboration_enabled)
  values (clean_title, clean_slug, false, false)
  on conflict (slug) do nothing;

  return new;
end;
$$;

drop trigger if exists brand_pitches_sync_song_to_tracker on public.brand_pitches;
create trigger brand_pitches_sync_song_to_tracker
after insert or update of song_title on public.brand_pitches
for each row execute function public.sync_brand_pitch_song_to_tracker();

-- Backfill current Studio projects through the same idempotent trigger.
update public.brand_pitches
set song_title = song_title
where nullif(btrim(song_title), '') is not null;
