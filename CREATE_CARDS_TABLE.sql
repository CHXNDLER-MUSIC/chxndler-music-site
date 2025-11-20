-- Cards table for CHXNDLER card game
-- Safe to run multiple times

begin;

-- Create cards table
CREATE TABLE IF NOT EXISTS public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_name text NOT NULL,
  element text,              -- heart, water, lightning, darkness
  rarity text,
  artwork_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
alter table public.cards enable row level security;

-- Allow authenticated users to read cards (public data)
grant select on table public.cards to authenticated;

-- Policy for reading cards (all authenticated users can read)
drop policy if exists "Authenticated users can read cards" on public.cards;
create policy "Authenticated users can read cards"
  on public.cards
  for select
  to authenticated
  using (true);

commit;