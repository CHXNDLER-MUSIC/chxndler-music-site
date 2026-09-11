-- Adds the one missing field for the reusable brand-pitch visual system: a
-- single "secondary campaign image" per brand. By design there are only two
-- required campaign images per brand — hero_art_path (already existed) and
-- this one — reused intelligently (different crop/position/overlay) across
-- later visual moments instead of requiring a dedicated image per section.
alter table public.brand_pitches
  add column if not exists secondary_art_path text;
