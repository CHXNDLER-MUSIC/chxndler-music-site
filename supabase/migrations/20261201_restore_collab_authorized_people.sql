-- Preserve a small service-role-only allowlist for approved collaborators who
-- do not yet have a collaboration request, such as personally approved guests.
create table if not exists public.collab_authorized_people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  normalized_name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.collab_authorized_people enable row level security;
revoke all on public.collab_authorized_people from anon, authenticated;
grant all on public.collab_authorized_people to service_role;

insert into public.collab_authorized_people (full_name, normalized_name)
values ('Ari Ness', 'ari ness')
on conflict (normalized_name) do update set full_name = excluded.full_name;

alter table public.collaboration_requests
  add column if not exists authorized_person_id uuid references public.collab_authorized_people(id) on delete set null;
create index if not exists collaboration_requests_authorized_person_idx
  on public.collaboration_requests(authorized_person_id, submitted_at desc)
  where authorized_person_id is not null;
