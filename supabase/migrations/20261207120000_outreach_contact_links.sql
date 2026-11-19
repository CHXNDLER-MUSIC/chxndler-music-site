-- Add explicit links to the existing private contact directory.  Nullable
-- links preserve every legacy snapshot and avoid guessing at duplicate people.
alter table public.outreach_records
  add column if not exists contact_id uuid references public.marketing_contacts(id) on delete set null,
  add column if not exists opportunity_url text not null default '',
  add column if not exists record_type text not null default 'opportunity';

alter table public.outreach_records drop constraint if exists outreach_records_record_type_check;
alter table public.outreach_records add constraint outreach_records_record_type_check
  check (record_type in ('prospect','opportunity'));

alter table public.outreach_records drop constraint if exists outreach_records_status_check;
alter table public.outreach_records add constraint outreach_records_status_check
  check (status is null or status in ('Planned','Contacted','Interested','Won','Closed','Not interested','Sent','Follow-up','Accepted','Declined'));

alter table public.sync_opportunities
  add column if not exists contact_id uuid references public.marketing_contacts(id) on delete set null,
  add column if not exists opportunity_url text not null default '';

alter table public.collaboration_invites
  add column if not exists personal_message text not null default '',
  add column if not exists contribution_type text not null default 'Other';

alter table public.gig_outreach
  add column if not exists contact_id uuid references public.marketing_contacts(id) on delete set null,
  add column if not exists song_id uuid references public.songs(id) on delete set null;

create index if not exists outreach_records_contact_idx on public.outreach_records(contact_id) where contact_id is not null;
create index if not exists sync_opportunities_contact_idx on public.sync_opportunities(contact_id) where contact_id is not null;
create index if not exists gig_outreach_contact_idx on public.gig_outreach(contact_id) where contact_id is not null;
create index if not exists gig_outreach_song_idx on public.gig_outreach(song_id) where song_id is not null;

-- Keep the existing admin/service-role access model intact.
alter table public.outreach_records enable row level security;
alter table public.sync_opportunities enable row level security;
alter table public.gig_outreach enable row level security;
revoke all on public.outreach_records, public.sync_opportunities, public.gig_outreach from anon, authenticated;
grant all on public.outreach_records, public.sync_opportunities, public.gig_outreach to service_role;

alter table public.admin_tasks
  add column if not exists outreach_record_id uuid references public.outreach_records(id) on delete cascade,
  add column if not exists sync_opportunity_id uuid references public.sync_opportunities(id) on delete cascade;
create unique index if not exists admin_tasks_outreach_followup_idx on public.admin_tasks(outreach_record_id) where outreach_record_id is not null;
create unique index if not exists admin_tasks_sync_followup_idx on public.admin_tasks(sync_opportunity_id) where sync_opportunity_id is not null;

create or replace function public.sync_outreach_followup_task() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.follow_up_at is null then
    update public.admin_tasks set status = 'done', due_at = null, updated_at = now()
    where outreach_record_id = new.id and status <> 'done';
    return new;
  end if;
  insert into public.admin_tasks (business_area, outreach_record_id, title, description, due_at, status)
  values ('chxndler', new.id, 'Follow up: ' || coalesce(nullif(new.playlist_name, ''), nullif(new.contact_name, ''), nullif(new.organization, ''), 'Outreach opportunity'), 'Outreach follow-up · ' || coalesce(nullif(new.category, ''), 'Other') || case when new.song_title is not null and new.song_title <> '' then ' · ' || new.song_title else '' end, new.follow_up_at, 'todo')
  on conflict (outreach_record_id) where outreach_record_id is not null do update
  set title = excluded.title, description = excluded.description, due_at = excluded.due_at,
      status = case when public.admin_tasks.status = 'done' then 'todo' else public.admin_tasks.status end,
      updated_at = now();
  return new;
end; $$;

create or replace function public.sync_outreach_followup_date() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.outreach_records set follow_up_at = case when new.status = 'done' then null else new.due_at end, updated_at = now()
  where id = new.outreach_record_id and follow_up_at is distinct from case when new.status = 'done' then null else new.due_at end;
  return new;
end; $$;

create or replace function public.sync_sync_followup_task() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.follow_up_at is null then
    update public.admin_tasks set status = 'done', due_at = null, updated_at = now()
    where sync_opportunity_id = new.id and status <> 'done';
    return new;
  end if;
  insert into public.admin_tasks (business_area, sync_opportunity_id, title, description, due_at, status)
  values ('chxndler', new.id, 'Sync follow-up: ' || new.project_name, 'Sync licensing follow-up' || case when new.song_id is not null then ' · Song ID ' || new.song_id::text else '' end, new.follow_up_at, 'todo')
  on conflict (sync_opportunity_id) where sync_opportunity_id is not null do update
  set title = excluded.title, description = excluded.description, due_at = excluded.due_at,
      status = case when public.admin_tasks.status = 'done' then 'todo' else public.admin_tasks.status end,
      updated_at = now();
  return new;
end; $$;

create or replace function public.sync_sync_followup_date() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.sync_opportunities set follow_up_at = case when new.status = 'done' then null else new.due_at end, updated_at = now()
  where id = new.sync_opportunity_id and follow_up_at is distinct from case when new.status = 'done' then null else new.due_at end;
  return new;
end; $$;

drop trigger if exists outreach_followup_task_sync on public.outreach_records;
create trigger outreach_followup_task_sync after insert or update of follow_up_at, contact_name, organization, playlist_name, category, song_title on public.outreach_records
for each row execute function public.sync_outreach_followup_task();
drop trigger if exists outreach_followup_date_sync on public.admin_tasks;
create trigger outreach_followup_date_sync after update of due_at, status on public.admin_tasks
for each row when (old.outreach_record_id is not null and (old.due_at is distinct from new.due_at or old.status is distinct from new.status))
execute function public.sync_outreach_followup_date();
drop trigger if exists sync_followup_task_sync on public.sync_opportunities;
create trigger sync_followup_task_sync after insert or update of follow_up_at, project_name, song_id on public.sync_opportunities
for each row execute function public.sync_sync_followup_task();
drop trigger if exists sync_followup_date_sync on public.admin_tasks;
create trigger sync_followup_date_sync after update of due_at, status on public.admin_tasks
for each row when (old.sync_opportunity_id is not null and (old.due_at is distinct from new.due_at or old.status is distinct from new.status))
execute function public.sync_sync_followup_date();

create table if not exists public.outreach_communications (
  id uuid primary key default gen_random_uuid(),
  outreach_record_id uuid not null references public.outreach_records(id) on delete cascade,
  channel text not null check (channel in ('email','dm','call','meeting','note')),
  occurred_at timestamptz not null default now(),
  summary text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists outreach_communications_record_date_idx
  on public.outreach_communications(outreach_record_id, occurred_at desc);
alter table public.outreach_communications enable row level security;
revoke all on public.outreach_communications from anon, authenticated;
grant all on public.outreach_communications to service_role;
