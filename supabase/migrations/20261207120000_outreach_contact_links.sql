-- Add explicit links to the existing private contact directory.  Nullable
-- links preserve every legacy snapshot and avoid guessing at duplicate people.
alter table public.outreach_records
  add column if not exists contact_id uuid references public.marketing_contacts(id) on delete set null,
  add column if not exists opportunity_url text not null default '';

alter table public.outreach_records drop constraint if exists outreach_records_status_check;
alter table public.outreach_records add constraint outreach_records_status_check
  check (status is null or status in ('Planned','Contacted','Interested','Won','Closed','Not interested','Sent','Follow-up','Accepted','Declined'));

alter table public.sync_opportunities
  add column if not exists contact_id uuid references public.marketing_contacts(id) on delete set null,
  add column if not exists opportunity_url text not null default '';

create index if not exists outreach_records_contact_idx on public.outreach_records(contact_id) where contact_id is not null;
create index if not exists sync_opportunities_contact_idx on public.sync_opportunities(contact_id) where contact_id is not null;

-- Keep the existing admin/service-role access model intact.
alter table public.outreach_records enable row level security;
alter table public.sync_opportunities enable row level security;
revoke all on public.outreach_records, public.sync_opportunities from anon, authenticated;
grant all on public.outreach_records, public.sync_opportunities to service_role;
