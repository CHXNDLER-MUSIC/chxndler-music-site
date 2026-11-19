create table if not exists public.marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  phone text,
  email text,
  note text,
  submitted_on timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.marketing_contacts is
  'Imported marketing contacts. Duplicate rows are retained to preserve the source list.';

create index if not exists marketing_contacts_first_name_idx on public.marketing_contacts (first_name);
create index if not exists marketing_contacts_last_name_idx on public.marketing_contacts (last_name);
create index if not exists marketing_contacts_email_idx on public.marketing_contacts (lower(email)) where email is not null;
create index if not exists marketing_contacts_phone_idx on public.marketing_contacts (phone) where phone is not null;

alter table public.marketing_contacts enable row level security;
revoke all on public.marketing_contacts from anon, authenticated;
grant all on public.marketing_contacts to service_role;
