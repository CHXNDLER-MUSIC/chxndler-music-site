-- ============================================================
-- app_settings: global key / value store for runtime flags
-- ============================================================

create table if not exists public.app_settings (
  key   text primary key,
  value text not null default 'false'
);

-- Seed the go_live_override flag (default OFF)
insert into public.app_settings (key, value)
values ('go_live_override', 'false')
on conflict (key) do nothing;

-- ── RLS ─────────────────────────────────────────────────────
alter table public.app_settings enable row level security;

-- Anyone can read (needed for browser clients + realtime)
create policy "Public read access"
  on public.app_settings
  for select
  using (true);

-- No browser writes — only the service-role key can mutate
-- (service role bypasses RLS automatically)

-- ── Realtime ────────────────────────────────────────────────
alter publication supabase_realtime add table public.app_settings;
