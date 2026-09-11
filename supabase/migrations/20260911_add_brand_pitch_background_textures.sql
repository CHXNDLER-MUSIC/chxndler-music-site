-- Optional, subtle atmosphere textures — NOT required content images.
-- A brand may supply 0-3+ soft background textures; the template applies
-- up to 3 of them (by position) as low-opacity full-bleed washes behind
-- three specific content sections (The Idea, Sonic Identity, Campaign
-- World), consistently across every brand. Gracefully absent when empty —
-- this does not violate "no custom background required per section," since
-- nothing here is required.
alter table public.brand_pitches
  add column if not exists background_textures jsonb not null default '[]'::jsonb;
