-- Update cards table to add gating columns
-- Safe to run multiple times

begin;

-- Add is_released column if it doesn't exist
alter table public.cards add column if not exists is_released boolean not null default false;

-- Add min_tier column if it doesn't exist
alter table public.cards add column if not exists min_tier text not null default 'wanderer';

-- Add check constraint for min_tier values (drop first if exists)
alter table public.cards drop constraint if exists cards_min_tier_check;
alter table public.cards add constraint cards_min_tier_check 
  check (min_tier in ('wanderer', 'dreamer', 'lover', 'guide'));

-- Update existing cards to be released by default (you can modify this later)
update public.cards 
set is_released = true 
where is_released = false;

commit;