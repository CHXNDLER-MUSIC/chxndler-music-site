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
