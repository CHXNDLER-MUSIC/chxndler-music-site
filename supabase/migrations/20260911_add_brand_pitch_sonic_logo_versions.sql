-- Scalable sonic-logo representation for public.brand_pitches — replaces the
-- fixed single sonic_logo_path column with a JSON array so a brand can have
-- a PRIMARY cut plus however many alternates (ALT 01, ALT 02, ALT 03, ...)
-- exist, with no schema change per alternate. Mirrors the alt_versions
-- convention already used for "Hear the Concept".
--
-- sonic_logo_path is left in place (not dropped) as a legacy fallback: the
-- app synthesizes a single-item "primary" list from it when
-- sonic_logo_versions is empty, so brands entered before this column existed
-- keep working without a data migration.
--
-- Example sonic_logo_versions value:
-- [
--   {"label": "PRIMARY", "path": "oatly/sonic-logo-primary.mp3", "role": "primary"},
--   {"label": "ALT 01",  "path": "oatly/sonic-logo-alt-01.mp3",  "role": "alternate"},
--   {"label": "ALT 02",  "path": "oatly/sonic-logo-alt-02.mp3",  "role": "alternate"}
-- ]
alter table public.brand_pitches
  add column if not exists sonic_logo_versions jsonb not null default '[]'::jsonb;
