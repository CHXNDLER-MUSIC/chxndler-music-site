-- Additive agreement workflow fields and immutable version snapshots.
alter table public.collaboration_requests
  add column if not exists agreement_type text,
  add column if not exists agreement_version integer not null default 0,
  add column if not exists agreement_approved_at timestamptz,
  add column if not exists agreement_approved_by text;

alter table public.collaboration_requests
  drop constraint if exists collaboration_requests_agreement_status_check;

update public.collaboration_requests
set agreement_status = case agreement_status
  when 'not_started' then 'draft'
  when 'pending' then 'draft'
  when 'sent' then 'awaiting_signature'
  else agreement_status
end;

alter table public.collaboration_requests
  add constraint collaboration_requests_agreement_status_check
  check (agreement_status in ('draft','offer_sent','negotiating','awaiting_signature','signed','declined','cancelled','completed'));

alter table public.collaboration_requests
  add constraint collaboration_requests_agreement_type_check
  check (agreement_type is null or agreement_type in ('singer_feature','remix','producer','videographer'));

create table if not exists public.collaboration_agreement_versions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.collaboration_requests(id) on delete restrict,
  song_id uuid references public.songs(id) on delete set null,
  invite_id uuid references public.collaboration_invites(id) on delete set null,
  authorized_person_id uuid references public.collab_authorized_people(id) on delete set null,
  agreement_type text not null check (agreement_type in ('singer_feature','remix','producer','videographer')),
  version integer not null check (version > 0),
  agreement_status text not null,
  structured_terms jsonb not null default '{}'::jsonb,
  document_path text,
  signed_document_path text,
  created_by text,
  created_at timestamptz not null default now(),
  unique (request_id, version)
);

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
