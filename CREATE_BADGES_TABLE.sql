-- Badges table for achievement system
-- Safe to run multiple times

begin;

-- Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_name text NOT NULL,
  icon_url text,
  description text,
  requirement text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
alter table public.badges enable row level security;

-- Allow authenticated users to read badges (public data)
grant select on table public.badges to authenticated;

-- Policy for reading badges (all authenticated users can read)
drop policy if exists "Authenticated users can read badges" on public.badges;
create policy "Authenticated users can read badges"
  on public.badges
  for select
  to authenticated
  using (true);

commit;