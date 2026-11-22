begin;

alter table public.collaboration_requests
  add column if not exists agreement_access_token_hash text,
  add column if not exists agreement_access_expires_at timestamptz,
  add column if not exists agreement_access_version integer,
  add column if not exists collaborator_first_name text,
  add column if not exists collaborator_last_name text,
  add column if not exists collaborator_printed_name text,
  add column if not exists collaborator_signature text,
  add column if not exists collaborator_signed_at timestamptz,
  add column if not exists collaborator_signed_version integer,
  add column if not exists collaborator_signature_email_sent_at timestamptz;

create unique index if not exists collaboration_requests_agreement_token_hash_uq
  on public.collaboration_requests(agreement_access_token_hash)
  where agreement_access_token_hash is not null;

commit;
