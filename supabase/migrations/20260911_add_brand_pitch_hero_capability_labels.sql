-- Bottom hero capability row (e.g. "Original Song • Campaign Cuts • Sonic
-- Identity"), previously hard-coded text in BrandHero.tsx. Stored as an
-- ordered jsonb array of strings so the row can have any number of labels
-- per brand. Defaults to the site's existing copy so no pitch regresses.
alter table public.brand_pitches
  add column if not exists hero_capability_labels jsonb not null default '["Original Song","Campaign Cuts","Sonic Identity"]'::jsonb;
