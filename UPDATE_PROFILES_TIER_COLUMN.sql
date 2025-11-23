-- Update profiles table to add tier column with constraints
-- Safe to run multiple times

begin;

-- Add tier column if it doesn't exist
alter table public.profiles add column if not exists tier text not null default 'wanderer';

-- Add check constraint for tier values (drop first if exists)
alter table public.profiles drop constraint if exists profiles_tier_check;
alter table public.profiles add constraint profiles_tier_check 
  check (tier in ('wanderer', 'dreamer', 'lover', 'guide'));

-- Update existing profiles with journey_tag values if tier is default
update public.profiles 
set tier = case 
  when journey_tag = 'wanderer' then 'wanderer'
  when journey_tag = 'dreamer' then 'dreamer' 
  when journey_tag = 'lover' then 'lover'
  when journey_tag = 'guide' then 'guide'
  else 'wanderer'
end
where tier = 'wanderer';

commit;