alter table public.collaboration_requests
  add column if not exists first_name text,
  add column if not exists last_name text;
