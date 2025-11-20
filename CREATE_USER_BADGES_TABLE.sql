-- User badges table for badge ownership tracking
-- Safe to run multiple times

begin;

-- Create user_badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

-- Enable Row Level Security
alter table public.user_badges enable row level security;

-- Grant permissions to authenticated users
grant select, insert on table public.user_badges to authenticated;

-- Policy for selecting user badges (users can only see their own badges)
drop policy if exists "Users can select their own badges" on public.user_badges;
create policy "Users can select their own badges"
  on public.user_badges
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy for inserting user badges (users can only insert their own badges)
drop policy if exists "Users can insert their own badges" on public.user_badges;
create policy "Users can insert their own badges"
  on public.user_badges
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Create index for performance
create index if not exists user_badges_user_id_idx on public.user_badges(user_id);
create index if not exists user_badges_badge_id_idx on public.user_badges(badge_id);

commit;