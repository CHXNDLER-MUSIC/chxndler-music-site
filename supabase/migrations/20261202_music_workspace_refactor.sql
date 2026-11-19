-- Add artist workflow fields to the canonical songs table. Existing songs are
-- intentionally not opted into the collaboration portal by this migration.
alter table public.songs
  add column if not exists ready_for_collab boolean not null default false,
  add column if not exists collab_interests text[] not null default '{}',
  add column if not exists collaboration_description text not null default '',
  add column if not exists workflow_stage text not null default 'Idea',
  add column if not exists next_action text not null default '',
  add column if not exists next_action_manual boolean not null default false;

alter table public.songs drop constraint if exists songs_workflow_stage_check;
alter table public.songs add constraint songs_workflow_stage_check
  check (workflow_stage in ('Idea','Writing','Recording','Mixing','Mastering','Ready'));
-- Preserve songs that were already deliberately opened for collaboration.
update public.songs set ready_for_collab = true where collaboration_enabled = true and ready_for_collab = false;
create index if not exists songs_ready_for_collab_idx
  on public.songs (ready_for_collab, is_released, title)
  where ready_for_collab = true;

-- Preserve the existing outreach_records table and its campaign history while
-- giving new records a canonical song relationship and follow-up lifecycle.
alter table public.outreach_records
  add column if not exists song_id uuid references public.songs(id) on delete set null,
  add column if not exists organization text,
  add column if not exists status text not null default 'Planned',
  add column if not exists sent_at date,
  add column if not exists follow_up_at date,
  add column if not exists result text not null default '';
alter table public.outreach_records drop constraint if exists outreach_records_status_check;
alter table public.outreach_records add constraint outreach_records_status_check
  check (status in ('Planned','Sent','Follow-up','Accepted','Declined','Closed'));
create index if not exists outreach_records_song_status_idx on public.outreach_records(song_id, status, follow_up_at);

-- Real sync prospects and confirmed placements are separate from the creative
-- song-match dataset in the existing SyncOutreachTab.
create table if not exists public.sync_opportunities (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references public.songs(id) on delete set null,
  project_name text not null,
  contact_name text not null default '',
  organization text not null default '',
  contact_email text not null default '',
  media_type text not null default '',
  deadline date,
  submitted_at date,
  status text not null default 'Researching' check (status in ('Researching','Ready to Pitch','Submitted','In Discussion','Licensed','Passed')),
  potential_fee numeric(12,2),
  follow_up_at date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sync_opportunities_status_followup_idx on public.sync_opportunities(status, follow_up_at);
create index if not exists sync_opportunities_song_idx on public.sync_opportunities(song_id);
alter table public.sync_opportunities enable row level security;
revoke all on public.sync_opportunities from anon, authenticated;
grant all on public.sync_opportunities to service_role;

create table if not exists public.sync_placements (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references public.songs(id) on delete set null,
  project_name text not null,
  media_type text not null default '',
  usage_details text not null default '',
  territory text not null default '',
  term text not null default '',
  agreement_reference text not null default '',
  fee numeric(12,2),
  payment_status text not null default 'Unpaid' check (payment_status in ('Unpaid','Pending','Paid')),
  placement_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sync_placements_song_idx on public.sync_placements(song_id);
create index if not exists sync_placements_date_idx on public.sync_placements(placement_date desc);
alter table public.sync_placements enable row level security;
revoke all on public.sync_placements from anon, authenticated;
grant all on public.sync_placements to service_role;
