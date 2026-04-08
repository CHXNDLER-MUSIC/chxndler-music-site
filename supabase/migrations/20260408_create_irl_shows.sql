-- Create table to store IRL shows
-- Minimal columns per request + housekeeping
create table if not exists public.irl_shows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Required fields
  location text not null,         -- Venue or event name
  date timestamptz not null,      -- Event date/time (with timezone)

  -- Optional fields
  cost text,                      -- e.g., 'FREE', '$10', 'Donation'
  directions text,                -- URL for maps/directions
  tickets_url text                -- URL for tickets
);

-- Helpful index for upcoming queries
create index if not exists irl_shows_date_idx on public.irl_shows (date);

-- Recommended RLS (adjust to your app's auth model)
-- alter table public.irl_shows enable row level security;
-- create policy "Public read shows" on public.irl_shows for select using (true);
