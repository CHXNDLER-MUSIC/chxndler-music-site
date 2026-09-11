-- Small credit line under "The Idea" section's payoff tagline, e.g.
-- "ORIGINAL MUSIC + SONIC IDENTITY BY CHXNDLER". Optional; the section
-- omits it cleanly when not set.
alter table public.brand_pitches
  add column if not exists idea_attribution text;
