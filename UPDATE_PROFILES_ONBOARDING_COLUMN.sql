-- Add has_completed_onboarding column to profiles table
-- Safe to run multiple times

begin;

-- Add has_completed_onboarding column if it doesn't exist
alter table public.profiles add column if not exists has_completed_onboarding boolean not null default false;

-- Update existing profiles that have both display_name and element set to mark onboarding as complete
-- This handles the migration for existing users
update public.profiles 
set has_completed_onboarding = true 
where display_name is not null 
  and display_name != '' 
  and element is not null 
  and element != ''
  and has_completed_onboarding = false;

commit;