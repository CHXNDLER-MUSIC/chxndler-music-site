-- Adds an optional "collectible card" section to the brand-pitch CMS
-- (public.brand_pitches) — a physical/collectible extension of the concept,
-- shown after "How It Could Live" when a card asset exists. Art path lives
-- in the same "Brands" storage bucket as everything else.
alter table public.brand_pitches
  add column if not exists collectible_eyebrow text,
  add column if not exists collectible_headline text,
  add column if not exists collectible_subhead text,
  add column if not exists collectible_body text,
  add column if not exists collectible_card_path text;
