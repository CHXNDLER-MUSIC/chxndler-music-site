alter table public.marketing_contacts
  add column if not exists site_profile_status text not null default 'unknown'
  check (site_profile_status in ('unknown', 'has_profile', 'no_profile'));

comment on column public.marketing_contacts.site_profile_status is
  'Admin-maintained status for whether this contact has a chxndler.world profile.';
