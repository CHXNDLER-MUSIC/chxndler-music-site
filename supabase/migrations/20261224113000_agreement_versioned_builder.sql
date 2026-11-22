-- Add version-bound approval, reusable template metadata, and signature evidence
-- without changing existing collaboration statuses or signed records.
alter table public.collaboration_requests
  add column if not exists agreement_approved_version integer,
  add column if not exists agreement_template_id text,
  add column if not exists agreement_template_version integer,
  add column if not exists signed_agreement_version integer;

alter table public.collaboration_agreement_versions
  add column if not exists agreement_template_id text,
  add column if not exists agreement_template_version integer,
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz;

-- Preserve historical approval meaning by binding existing approvals to the
-- agreement version that was current when this additive migration is applied.
update public.collaboration_requests
set agreement_approved_version = agreement_version
where agreement_approved_at is not null
  and agreement_approved_version is null;

update public.collaboration_requests
set agreement_template_id = coalesce(
      agreement_template_id,
      agreement_terms->>'template_id',
      case agreement_type
        when 'singer_feature' then 'chxndler-singer-feature'
        when 'producer' then 'chxndler-producer'
        when 'remix' then 'chxndler-remix'
        when 'videographer' then 'chxndler-videographer'
      end
    ),
    agreement_template_version = coalesce(
      agreement_template_version,
      case when agreement_terms->>'template_version' ~ '^[0-9]+$'
        then (agreement_terms->>'template_version')::integer end,
      1
    )
where agreement_type is not null;

update public.collaboration_requests
set signed_agreement_version = agreement_version
where agreement_status = 'signed'
  and signed_agreement_path is not null
  and signed_agreement_version is null;

update public.collaboration_agreement_versions v
set agreement_template_id = r.agreement_template_id,
    agreement_template_version = r.agreement_template_version
from public.collaboration_requests r
where r.id = v.request_id
  and v.agreement_template_id is null;

create index if not exists collaboration_requests_approved_version_idx
  on public.collaboration_requests(id, agreement_approved_version)
  where agreement_approved_version is not null;
