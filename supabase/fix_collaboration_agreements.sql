-- Additive, rerunnable agreement versioning for the existing collaboration
-- system. No requests, terms, or signed-document paths are deleted or replaced.
-- authorized_person_id is retained as snapshot metadata, without an FK: the
-- request is the canonical parent and the allowlist is maintained separately.
begin;

do $$
begin
  if to_regclass('public.collaboration_requests') is null then
    raise exception 'Required table public.collaboration_requests is missing. Apply the existing collaboration_requests migration first.';
  end if;
  if to_regclass('public.collaboration_invites') is null then
    raise exception 'Required table public.collaboration_invites is missing. Apply the existing collaboration_invites migration first.';
  end if;
  if to_regclass('public.songs') is null then
    raise exception 'Required table public.songs is missing. Apply the existing songs migration first.';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='collaboration_requests' and column_name='id')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='collaboration_invites' and column_name='id')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='songs' and column_name='id') then
    raise exception 'A required collaboration_requests, collaboration_invites, or songs primary-key column is missing.';
  end if;
end $$;

-- Ensure every field referenced by the agreement UI/API and protection trigger
-- exists. ADD COLUMN IF NOT EXISTS preserves all existing values.
alter table public.collaboration_requests
  add column if not exists agreement_type text,
  add column if not exists agreement_version integer not null default 0,
  add column if not exists agreement_approved_at timestamptz,
  add column if not exists agreement_approved_by text,
  add column if not exists agreement_status text,
  add column if not exists agreement_terms jsonb not null default '{}'::jsonb,
  add column if not exists agreement_path text,
  add column if not exists signed_agreement_path text,
  add column if not exists admin_legal_name text,
  add column if not exists artist_credit text,
  add column if not exists master_royalty numeric(5,2),
  add column if not exists publishing_royalty numeric(5,2),
  add column if not exists flat_fee numeric(12,2);

alter table public.collaboration_invites
  add column if not exists agreement_type text;

-- Remove only checks that constrain these two workflow columns, including the
-- original inline legacy check and any equivalent partially-applied version.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid='public.collaboration_requests'::regclass
      and contype='c' and position('agreement_status' in pg_get_constraintdef(oid)) > 0
  loop
    execute format('alter table public.collaboration_requests drop constraint %I', c.conname);
  end loop;
  for c in
    select conname from pg_constraint
    where conrelid='public.collaboration_requests'::regclass
      and contype='c' and position('agreement_type' in pg_get_constraintdef(oid)) > 0
  loop
    execute format('alter table public.collaboration_requests drop constraint %I', c.conname);
  end loop;
  for c in
    select conname from pg_constraint
    where conrelid='public.collaboration_invites'::regclass
      and contype='c' and position('agreement_type' in pg_get_constraintdef(oid)) > 0
  loop
    execute format('alter table public.collaboration_invites drop constraint %I', c.conname);
  end loop;
end $$;

-- Normalize only the three legacy labels this site historically used. Signed
-- rows remain signed; agreement paths, terms, and timestamps are untouched.
update public.collaboration_requests
set agreement_status = case agreement_status
  when 'not_started' then 'draft'
  when 'pending' then 'draft'
  when 'sent' then 'awaiting_signature'
  else agreement_status
end
where agreement_status in ('not_started','pending','sent');

update public.collaboration_requests set agreement_status='draft' where agreement_status is null;
alter table public.collaboration_requests alter column agreement_status set default 'draft';
alter table public.collaboration_requests alter column agreement_status set not null;

do $$
begin
  if exists (select 1 from public.collaboration_requests where agreement_status not in ('draft','offer_sent','negotiating','awaiting_signature','signed','declined','cancelled','completed')) then
    raise exception 'Unexpected agreement_status value exists; review it before applying the agreement workflow migration.';
  end if;
  if exists (select 1 from public.collaboration_requests where agreement_type is not null and agreement_type not in ('singer_feature','remix','producer','videographer')) then
    raise exception 'Unexpected collaboration_requests.agreement_type exists; review it before applying the agreement workflow migration.';
  end if;
  if exists (select 1 from public.collaboration_invites where agreement_type is not null and agreement_type not in ('singer_feature','remix','producer','videographer')) then
    raise exception 'Unexpected collaboration_invites.agreement_type exists; review it before applying the agreement workflow migration.';
  end if;
end $$;

alter table public.collaboration_requests
  add constraint collaboration_requests_agreement_status_check
  check (agreement_status in ('draft','offer_sent','negotiating','awaiting_signature','signed','declined','cancelled','completed'));
alter table public.collaboration_requests
  add constraint collaboration_requests_agreement_type_check
  check (agreement_type is null or agreement_type in ('singer_feature','remix','producer','videographer'));
alter table public.collaboration_invites
  add constraint collaboration_invites_agreement_type_check
  check (agreement_type is null or agreement_type in ('singer_feature','remix','producer','videographer'));

-- Create or repair the immutable version table without depending on the
-- separately-managed collab_authorized_people allowlist relation.
create table if not exists public.collaboration_agreement_versions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  song_id uuid,
  invite_id uuid,
  authorized_person_id uuid,
  agreement_type text not null,
  version integer not null,
  agreement_status text not null,
  structured_terms jsonb not null default '{}'::jsonb,
  document_path text,
  signed_document_path text,
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.collaboration_agreement_versions
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists request_id uuid,
  add column if not exists song_id uuid,
  add column if not exists invite_id uuid,
  add column if not exists authorized_person_id uuid,
  add column if not exists agreement_type text,
  add column if not exists version integer,
  add column if not exists agreement_status text,
  add column if not exists structured_terms jsonb not null default '{}'::jsonb,
  add column if not exists document_path text,
  add column if not exists signed_document_path text,
  add column if not exists created_by text,
  add column if not exists created_at timestamptz not null default now();

-- Remove only any version-table FK on the optional authorization snapshot.
-- The request-level authorization ID and allowlist table are not changed here.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid='public.collaboration_agreement_versions'::regclass
      and contype='f'
      and conkey @> array[(select attnum from pg_attribute where attrelid='public.collaboration_agreement_versions'::regclass and attname='authorized_person_id')]::smallint[]
  loop
    execute format('alter table public.collaboration_agreement_versions drop constraint %I', c.conname);
  end loop;
end $$;

do $$
declare c record;
begin
  if exists (select 1 from public.collaboration_agreement_versions where id is null or request_id is null or agreement_type is null or version is null or agreement_status is null) then
    raise exception 'The partially existing collaboration_agreement_versions table contains incomplete rows. No rows were changed; inspect it before rerunning.';
  end if;
  if exists (select 1 from public.collaboration_agreement_versions where version <= 0) then
    raise exception 'The partially existing collaboration_agreement_versions table contains a nonpositive version number.';
  end if;
  if exists (select 1 from public.collaboration_agreement_versions where agreement_type not in ('singer_feature','remix','producer','videographer')) then
    raise exception 'The partially existing collaboration_agreement_versions table contains an unsupported agreement type.';
  end if;
  if exists (select 1 from public.collaboration_agreement_versions group by request_id,version having count(*) > 1) then
    raise exception 'Duplicate request/version pairs exist in collaboration_agreement_versions; resolve duplicates without deleting signed history.';
  end if;
  alter table public.collaboration_agreement_versions alter column id set not null;
  alter table public.collaboration_agreement_versions alter column request_id set not null;
  alter table public.collaboration_agreement_versions alter column agreement_type set not null;
  alter table public.collaboration_agreement_versions alter column version set not null;
  alter table public.collaboration_agreement_versions alter column agreement_status set not null;
end $$;

-- Add missing canonical FKs only when an equivalent FK is not already present.
do $$
declare
  request_col smallint := (select attnum from pg_attribute where attrelid='public.collaboration_agreement_versions'::regclass and attname='request_id');
  song_col smallint := (select attnum from pg_attribute where attrelid='public.collaboration_agreement_versions'::regclass and attname='song_id');
  invite_col smallint := (select attnum from pg_attribute where attrelid='public.collaboration_agreement_versions'::regclass and attname='invite_id');
begin
  if not exists (select 1 from pg_constraint where conrelid='public.collaboration_agreement_versions'::regclass and contype='f' and conkey=array[request_col]::smallint[] and confrelid='public.collaboration_requests'::regclass) then
    alter table public.collaboration_agreement_versions add constraint collaboration_agreement_versions_request_fk foreign key (request_id) references public.collaboration_requests(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.collaboration_agreement_versions'::regclass and contype='f' and conkey=array[song_col]::smallint[] and confrelid='public.songs'::regclass) then
    alter table public.collaboration_agreement_versions add constraint collaboration_agreement_versions_song_fk foreign key (song_id) references public.songs(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.collaboration_agreement_versions'::regclass and contype='f' and conkey=array[invite_col]::smallint[] and confrelid='public.collaboration_invites'::regclass) then
    alter table public.collaboration_agreement_versions add constraint collaboration_agreement_versions_invite_fk foreign key (invite_id) references public.collaboration_invites(id) on delete set null;
  end if;
end $$;

create unique index if not exists collaboration_agreement_versions_request_version_uq
  on public.collaboration_agreement_versions(request_id, version);
create unique index if not exists collaboration_agreement_versions_id_uq
  on public.collaboration_agreement_versions(id);
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.collaboration_agreement_versions'::regclass and conname='collaboration_agreement_versions_type_check') then
    alter table public.collaboration_agreement_versions add constraint collaboration_agreement_versions_type_check
      check (agreement_type in ('singer_feature','remix','producer','videographer'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.collaboration_agreement_versions'::regclass and conname='collaboration_agreement_versions_version_check') then
    alter table public.collaboration_agreement_versions add constraint collaboration_agreement_versions_version_check
      check (version > 0);
  end if;
end $$;
create index if not exists collaboration_agreement_versions_request_idx
  on public.collaboration_agreement_versions(request_id, version desc);

alter table public.collaboration_agreement_versions enable row level security;
revoke all on public.collaboration_agreement_versions from anon, authenticated;
grant all on public.collaboration_agreement_versions to service_role;

create or replace function public.prevent_collaboration_agreement_version_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Agreement version snapshots are immutable';
end;
$$;

drop trigger if exists collaboration_agreement_versions_immutable on public.collaboration_agreement_versions;
create trigger collaboration_agreement_versions_immutable
before update or delete on public.collaboration_agreement_versions
for each row execute function public.prevent_collaboration_agreement_version_mutation();

create or replace function public.prevent_signed_collaboration_agreement_edits()
returns trigger language plpgsql as $$
begin
  if old.agreement_status = 'signed' and (
    new.agreement_terms is distinct from old.agreement_terms or
    new.agreement_type is distinct from old.agreement_type or
    new.agreement_version is distinct from old.agreement_version or
    new.agreement_path is distinct from old.agreement_path or
    new.signed_agreement_path is distinct from old.signed_agreement_path or
    new.admin_legal_name is distinct from old.admin_legal_name or
    new.artist_credit is distinct from old.artist_credit or
    new.master_royalty is distinct from old.master_royalty or
    new.publishing_royalty is distinct from old.publishing_royalty or
    new.flat_fee is distinct from old.flat_fee
  ) then
    raise exception 'Signed collaboration agreements are immutable; create an amendment version';
  end if;
  return new;
end;
$$;

drop trigger if exists collaboration_requests_signed_agreement_immutable on public.collaboration_requests;
create trigger collaboration_requests_signed_agreement_immutable
before update on public.collaboration_requests
for each row execute function public.prevent_signed_collaboration_agreement_edits();

-- Verify both guards, including a rollback-only probe against one existing
-- signed agreement/version if present. The probe's nested exception block rolls
-- back any attempted update and never changes a stored document or agreement.
do $$
declare
  request_id_to_test uuid;
  version_id_to_test uuid;
  blocked boolean;
  probe_message text;
begin
  if not exists (select 1 from pg_trigger where tgname='collaboration_requests_signed_agreement_immutable' and tgrelid='public.collaboration_requests'::regclass and not tgisinternal)
     or not exists (select 1 from pg_trigger where tgname='collaboration_agreement_versions_immutable' and tgrelid='public.collaboration_agreement_versions'::regclass and not tgisinternal) then
    raise exception 'Agreement immutability triggers were not installed.';
  end if;

  select id into request_id_to_test from public.collaboration_requests where agreement_status='signed' limit 1;
  if request_id_to_test is not null then
    blocked := false;
    begin
      update public.collaboration_requests
      set agreement_terms = agreement_terms || jsonb_build_object('__agreement_trigger_probe', gen_random_uuid()::text)
      where id=request_id_to_test;
      raise exception '__agreement_probe_update_succeeded__';
    exception when others then
      get stacked diagnostics probe_message = message_text;
      if probe_message='Signed collaboration agreements are immutable; create an amendment version' then
        blocked := true;
      elsif probe_message <> '__agreement_probe_update_succeeded__' then
        raise;
      end if;
    end;
    if not blocked then raise exception 'Signed-agreement protection trigger did not block the probe update.'; end if;
  end if;

  select id into version_id_to_test from public.collaboration_agreement_versions limit 1;
  if version_id_to_test is not null then
    blocked := false;
    begin
      update public.collaboration_agreement_versions set id=id where id=version_id_to_test;
      raise exception '__version_probe_update_succeeded__';
    exception when others then
      get stacked diagnostics probe_message = message_text;
      if probe_message='Agreement version snapshots are immutable' then
        blocked := true;
      elsif probe_message <> '__version_probe_update_succeeded__' then
        raise;
      end if;
    end;
    if not blocked then raise exception 'Agreement version immutability trigger did not block the probe update.'; end if;
  end if;
end $$;

commit;
