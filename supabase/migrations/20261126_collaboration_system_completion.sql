-- Add missing idempotency and privacy-preserving rate-limit fields used by the
-- existing collaboration submission endpoint. Existing requests get stable keys.
alter table public.collaboration_requests
  add column if not exists submission_key uuid not null default gen_random_uuid(),
  add column if not exists submission_ip_hash text,
  add column if not exists signed_agreement_path text,
  add column if not exists agreement_sent_at timestamptz,
  add column if not exists agreed_ownership_terms text not null default '',
  add column if not exists agreed_distribution_permissions text not null default '',
  add column if not exists agreed_release_restrictions text not null default '',
  add column if not exists agreed_credit_requirements text not null default '';

create unique index if not exists collaboration_requests_submission_key_idx
  on public.collaboration_requests(submission_key);
create index if not exists collaboration_requests_ip_submitted_idx
  on public.collaboration_requests(submission_ip_hash, submitted_at desc)
  where submission_ip_hash is not null;

-- Atomic per-hour rate limit. The upsert is one database statement so parallel
-- requests from the same privacy-preserving IP hash cannot race past the cap.
create table if not exists public.collaboration_rate_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (ip_hash, window_start)
);
alter table public.collaboration_rate_limits enable row level security;
revoke all on public.collaboration_rate_limits from anon, authenticated;
grant all on public.collaboration_rate_limits to service_role;

create or replace function public.consume_collaboration_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare allowed boolean;
begin
  insert into public.collaboration_rate_limits(ip_hash, window_start, request_count)
  values (p_ip_hash, date_trunc('hour', now()), 1)
  on conflict (ip_hash, window_start) do update
    set request_count = collaboration_rate_limits.request_count + 1
    where collaboration_rate_limits.request_count < 4
  returning true into allowed;
  return coalesce(allowed, false);
end;
$$;
revoke all on function public.consume_collaboration_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_collaboration_rate_limit(text) to service_role;

-- Agreements are private documents. Access is mediated by authenticated server
-- routes that use the service role and short-lived signed download URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('collaboration-agreements', 'collaboration-agreements', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

drop policy if exists "collaboration agreements service access" on storage.objects;
create policy "collaboration agreements service access" on storage.objects
  for all to service_role
  using (bucket_id = 'collaboration-agreements')
  with check (bucket_id = 'collaboration-agreements');
