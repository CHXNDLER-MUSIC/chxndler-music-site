-- Independent background styling for "Created by CHXNDLER" (about section) —
-- previously forced to reuse the same derived "light" tone as Hear the
-- Concept, with no way to give it its own color or photo. Same
-- image-path/color-string convention as every other section (e.g.
-- secondary_art_path + accent_color): an image (from the "Brands" storage
-- bucket) takes priority when set, else the color, else the template's
-- existing derived-light fallback — nothing regresses for a pitch that sets
-- neither.
alter table public.brand_pitches
  add column if not exists about_background_color text,
  add column if not exists about_background_image_path text;
