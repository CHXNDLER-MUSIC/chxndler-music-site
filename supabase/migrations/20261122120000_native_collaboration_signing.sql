begin;

alter table public.collaboration_requests
  add column if not exists agreement_email_code_hash text,
  add column if not exists agreement_email_code_expires_at timestamptz,
  add column if not exists agreement_email_code_sent_at timestamptz,
  add column if not exists agreement_email_code_attempts integer not null default 0,
  add column if not exists agreement_verified_session_hash text,
  add column if not exists agreement_verified_session_expires_at timestamptz,
  add column if not exists collaborator_signature_consent_at timestamptz,
  add column if not exists collaborator_signature_ip text,
  add column if not exists collaborator_signature_user_agent text,
  add column if not exists collaborator_signed_snapshot_hash text,
  add column if not exists admin_signed_at timestamptz,
  add column if not exists admin_signature text,
  add column if not exists signed_agreement_hash text;

alter table public.collaboration_agreement_versions
  add column if not exists snapshot_hash text,
  add column if not exists signed_at timestamptz,
  add column if not exists signed_by_email text,
  add column if not exists signed_snapshot_hash text,
  add column if not exists signature_metadata jsonb not null default '{}'::jsonb;

create index if not exists collaboration_requests_agreement_session_idx
  on public.collaboration_requests(agreement_verified_session_hash)
  where agreement_verified_session_hash is not null;

commit;
