-- Secret phrases and redemptions tables with RLS
-- Safe to run multiple times

begin;

-- Create secret_phrases table
create table if not exists public.secret_phrases (
  id uuid primary key default gen_random_uuid(),
  code text not null,                       -- the phrase, like 'soul tide'
  label text,                               -- human label, like 'Twitch stream 2025 11 21'
  context text not null default 'global',   -- examples: 'twitch', 'live_show', 'global'
  start_at timestamptz not null,           -- when the phrase becomes valid
  end_at timestamptz not null,             -- when it stops being valid
  reward_heart_coins integer not null default 0, -- aligning with existing heart_coins_current naming
  created_at timestamptz not null default now()
);

-- Create secret_phrase_redemptions table
create table if not exists public.secret_phrase_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  secret_phrase_id uuid not null references public.secret_phrases (id) on delete cascade,
  heart_coins_awarded integer not null default 0,
  redeemed_at timestamptz not null default now(),
  constraint secret_phrase_redemptions_unique unique (user_id, secret_phrase_id)
);

-- Enable Row Level Security
alter table public.secret_phrases enable row level security;
alter table public.secret_phrase_redemptions enable row level security;

-- Grant permissions
grant usage on schema public to authenticated;
grant select on table public.secret_phrases to authenticated;
grant select, insert on table public.secret_phrase_redemptions to authenticated;

-- Secret phrases policies (re-create to ensure idempotency)
drop policy if exists "Authenticated users can view active secret phrases" on public.secret_phrases;
drop policy if exists "Service role can manage secret phrases" on public.secret_phrases;

create policy "Authenticated users can view active secret phrases"
  on public.secret_phrases
  for select
  to authenticated
  using (true); -- Allow viewing all phrases (users will filter for active ones)

create policy "Service role can manage secret phrases"
  on public.secret_phrases
  for all
  to service_role
  using (true)
  with check (true);

-- Secret phrase redemptions policies (re-create to ensure idempotency)
drop policy if exists "Users can view their own redemptions" on public.secret_phrase_redemptions;
drop policy if exists "Users can insert their own redemptions" on public.secret_phrase_redemptions;

create policy "Users can view their own redemptions"
  on public.secret_phrase_redemptions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own redemptions"
  on public.secret_phrase_redemptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

commit;