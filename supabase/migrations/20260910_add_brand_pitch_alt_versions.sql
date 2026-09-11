-- Adds a flexible "Instrumental + Alt Versions" section to the brand-pitch CMS
-- (public.brand_pitches). alt_versions is a JSON array of { "label": "...", "path": "..." }
-- so any brand can offer any number/kind of alternate cuts (acoustic, instrumental,
-- remix, extended, radio edit, ...) from the "brands - tracks" bucket without a
-- schema change per version type.
--
-- Example alt_versions value:
-- [
--   {"label": "ACOUSTIC", "path": "oatly/wow-no-cow-acoustic.mp3"},
--   {"label": "INSTRUMENTAL", "path": "oatly/wow-no-cow-instrumental.mp3"},
--   {"label": "REMIX", "path": "oatly/wow-no-cow-remix.mp3"}
-- ]
alter table public.brand_pitches
  add column if not exists alt_versions_eyebrow text,
  add column if not exists alt_versions_headline text,
  add column if not exists alt_versions_description text,
  add column if not exists alt_versions jsonb not null default '[]'::jsonb;
