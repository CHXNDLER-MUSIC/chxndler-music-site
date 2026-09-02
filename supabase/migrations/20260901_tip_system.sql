-- ============================================================================
-- CHXNDLER /tip experience — full Supabase setup
-- Safe to run multiple times (idempotent). Paste into the Supabase SQL Editor.
--
-- Creates:
--   tables : tip_payment_methods, tip_sessions, tip_events, tip_transactions
--   views  : tip_funnel_summary, tip_daily_summary, tip_source_summary,
--            tip_campaign_summary
--
-- Security model:
--   * Only public payment destinations (tip_payment_methods, enabled rows) are
--     readable by the anon key.
--   * All analytics + money tables are service-role only. The site writes to
--     them exclusively from server routes using SUPABASE_SERVICE_ROLE_KEY.
--   * No card data, no bank details, no precise location, no raw IP is stored.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. tip_payment_methods — editable secondary payment destinations (Venmo)
-- ----------------------------------------------------------------------------
create table if not exists public.tip_payment_methods (
  id             uuid primary key default gen_random_uuid(),
  provider       text not null,
  button_label   text not null,
  public_url     text not null,
  display_handle text,
  enabled        boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Additive columns, in case a drifted copy of this table already exists live.
alter table public.tip_payment_methods add column if not exists provider       text;
alter table public.tip_payment_methods add column if not exists button_label   text;
alter table public.tip_payment_methods add column if not exists public_url     text;
alter table public.tip_payment_methods add column if not exists display_handle text;
alter table public.tip_payment_methods add column if not exists enabled        boolean not null default true;
alter table public.tip_payment_methods add column if not exists sort_order     integer not null default 0;
alter table public.tip_payment_methods add column if not exists created_at     timestamptz not null default now();
alter table public.tip_payment_methods add column if not exists updated_at     timestamptz not null default now();

alter table public.tip_payment_methods enable row level security;

drop policy if exists "tip_payment_methods public read enabled" on public.tip_payment_methods;
create policy "tip_payment_methods public read enabled"
  on public.tip_payment_methods
  for select
  to anon, authenticated
  using (enabled = true);

drop policy if exists "tip_payment_methods service role all" on public.tip_payment_methods;
create policy "tip_payment_methods service role all"
  on public.tip_payment_methods
  for all
  to service_role
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant select on table public.tip_payment_methods to anon, authenticated;

-- Seed the Venmo row once.
insert into public.tip_payment_methods
  (provider, button_label, public_url, display_handle, enabled, sort_order)
select 'venmo', 'VENMO', 'https://venmo.com/u/CHXNDLERTHEALIEN', '@CHXNDLERTHEALIEN', true, 1
where not exists (
  select 1 from public.tip_payment_methods where provider = 'venmo'
);

-- ----------------------------------------------------------------------------
-- 2. tip_sessions — one row per anonymous visitor/session
-- ----------------------------------------------------------------------------
create table if not exists public.tip_sessions (
  id               text primary key,            -- client-generated, e.g. ts_<uuid>
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  source           text not null default 'direct',
  campaign         text not null default 'none',
  referrer         text,
  device_category  text,                         -- mobile | tablet | desktop
  browser          text,
  country          text,                         -- coarse, from edge header only
  user_agent       text,
  metadata         jsonb not null default '{}'::jsonb
);

alter table public.tip_sessions enable row level security;

drop policy if exists "tip_sessions service role all" on public.tip_sessions;
create policy "tip_sessions service role all"
  on public.tip_sessions
  for all
  to service_role
  using (true)
  with check (true);
-- No anon/authenticated policies: analytics is not publicly readable.

-- ----------------------------------------------------------------------------
-- 3. tip_events — funnel analytics event stream
-- ----------------------------------------------------------------------------
create table if not exists public.tip_events (
  id                       bigint generated always as identity primary key,
  session_id               text,
  event_type               text not null,
  amount_cents             integer,
  source                   text not null default 'direct',
  campaign                 text not null default 'none',
  provider                 text,
  stripe_payment_intent_id text,
  metadata                 jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now()
);

alter table public.tip_events drop constraint if exists tip_events_event_type_check;
alter table public.tip_events add constraint tip_events_event_type_check check (
  event_type in (
    'tip_page_view',
    'amount_selected',
    'other_amount_selected',
    'payment_started',
    'payment_completed',
    'payment_failed',
    'venmo_clicked',
    'heartverse_welcome_viewed',
    'heartverse_enter_clicked',
    'tip_error'
  )
);

create index if not exists tip_events_created_at_idx  on public.tip_events (created_at);
create index if not exists tip_events_event_type_idx  on public.tip_events (event_type);
create index if not exists tip_events_session_id_idx  on public.tip_events (session_id);
create index if not exists tip_events_source_idx      on public.tip_events (source);
create index if not exists tip_events_campaign_idx    on public.tip_events (campaign);

alter table public.tip_events enable row level security;

drop policy if exists "tip_events service role all" on public.tip_events;
create policy "tip_events service role all"
  on public.tip_events
  for all
  to service_role
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- 4. tip_transactions — confirmed money, written only by the Stripe webhook
-- ----------------------------------------------------------------------------
create table if not exists public.tip_transactions (
  id                       bigint generated always as identity primary key,
  provider                 text not null default 'stripe',
  stripe_payment_intent_id text not null unique,   -- idempotency key
  session_id               text,
  amount_cents             integer not null,
  currency                 text not null default 'usd',
  status                   text not null,          -- succeeded | failed | processing
  source                   text not null default 'direct',
  campaign                 text not null default 'none',
  metadata                 jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists tip_transactions_created_at_idx on public.tip_transactions (created_at);
create index if not exists tip_transactions_status_idx     on public.tip_transactions (status);
create index if not exists tip_transactions_source_idx     on public.tip_transactions (source);
create index if not exists tip_transactions_campaign_idx   on public.tip_transactions (campaign);

alter table public.tip_transactions enable row level security;

drop policy if exists "tip_transactions service role all" on public.tip_transactions;
create policy "tip_transactions service role all"
  on public.tip_transactions
  for all
  to service_role
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- 5. Reporting views
-- ----------------------------------------------------------------------------

-- Dropped + recreated so re-running picks up column changes (CREATE OR REPLACE
-- VIEW cannot rename/reorder/remove existing columns).
drop view if exists public.tip_funnel_summary;
drop view if exists public.tip_daily_summary;
drop view if exists public.tip_source_summary;
drop view if exists public.tip_campaign_summary;

-- Overall funnel, one row.
create or replace view public.tip_funnel_summary as
with ev as (
  select * from public.tip_events
),
tx as (
  select * from public.tip_transactions where status = 'succeeded'
)
select
  (select count(*) from ev where event_type = 'tip_page_view')                            as tip_page_views,
  (select count(distinct session_id) from ev)                                             as unique_sessions,
  (select count(*) from ev where event_type = 'amount_selected' and amount_cents = 100)   as amount_1_selections,
  (select count(*) from ev where event_type = 'amount_selected' and amount_cents = 300)   as amount_3_selections,
  (select count(*) from ev where event_type = 'amount_selected' and amount_cents = 500)   as amount_5_selections,
  (select count(*) from ev where event_type = 'amount_selected' and amount_cents = 1000)  as amount_10_selections,
  (select count(*) from ev where event_type = 'other_amount_selected')                    as custom_amount_selections,
  (select count(*) from ev where event_type = 'payment_started')                          as stripe_payment_starts,
  (select count(*) from tx)                                                               as successful_stripe_tips,
  coalesce((select sum(amount_cents) from tx), 0) / 100.0                                  as total_dollars_tipped,
  round(coalesce((select avg(amount_cents) from tx), 0) / 100.0, 2)                        as average_tip_dollars,
  case
    when (select count(*) from ev where event_type = 'tip_page_view') > 0
    then round(
      100.0 * (select count(*) from tx)
      / (select count(*) from ev where event_type = 'tip_page_view'), 2)
    else 0
  end                                                                                     as page_view_to_tip_conversion_pct,
  (select count(*) from ev where event_type = 'venmo_clicked')                            as venmo_clicks,
  (select count(*) from ev where event_type = 'heartverse_welcome_viewed')                as heartverse_welcome_views,
  (select count(*) from ev where event_type = 'heartverse_enter_clicked')                 as heartverse_enter_clicks;

-- Per-day funnel.
create or replace view public.tip_daily_summary as
select
  date_trunc('day', ev.created_at)::date                                                    as day,
  count(*) filter (where ev.event_type = 'tip_page_view')                                    as tip_page_views,
  count(distinct ev.session_id)                                                              as unique_sessions,
  count(*) filter (where ev.event_type = 'amount_selected')                                  as amount_selections,
  count(*) filter (where ev.event_type = 'other_amount_selected')                            as custom_amount_selections,
  count(*) filter (where ev.event_type = 'payment_started')                                  as stripe_payment_starts,
  count(*) filter (where ev.event_type = 'venmo_clicked')                                    as venmo_clicks,
  count(*) filter (where ev.event_type = 'heartverse_enter_clicked')                         as heartverse_enter_clicks,
  coalesce(tx.successful_tips, 0)                                                            as successful_stripe_tips,
  coalesce(tx.dollars, 0)                                                                   as total_dollars_tipped
from public.tip_events ev
left join (
  select date_trunc('day', created_at)::date as day,
         count(*) as successful_tips,
         sum(amount_cents) / 100.0 as dollars
  from public.tip_transactions
  where status = 'succeeded'
  group by 1
) tx on tx.day = date_trunc('day', ev.created_at)::date
group by date_trunc('day', ev.created_at)::date, tx.successful_tips, tx.dollars
order by day desc;

-- Per physical QR sign (source).
create or replace view public.tip_source_summary as
select
  coalesce(ev.source, 'direct')                                             as source,
  count(*) filter (where ev.event_type = 'tip_page_view')                   as tip_page_views,
  count(distinct ev.session_id)                                             as unique_sessions,
  count(*) filter (where ev.event_type = 'payment_started')                 as stripe_payment_starts,
  count(*) filter (where ev.event_type = 'venmo_clicked')                   as venmo_clicks,
  coalesce(tx.successful_tips, 0)                                           as successful_stripe_tips,
  coalesce(tx.dollars, 0)                                                   as total_dollars_tipped,
  case
    when count(*) filter (where ev.event_type = 'tip_page_view') > 0
    then round(100.0 * coalesce(tx.successful_tips, 0)
      / count(*) filter (where ev.event_type = 'tip_page_view'), 2)
    else 0
  end                                                                      as conversion_pct
from public.tip_events ev
left join (
  select source, count(*) as successful_tips, sum(amount_cents) / 100.0 as dollars
  from public.tip_transactions
  where status = 'succeeded'
  group by source
) tx on tx.source = coalesce(ev.source, 'direct')
group by coalesce(ev.source, 'direct'), tx.successful_tips, tx.dollars
order by total_dollars_tipped desc, tip_page_views desc;

-- Per campaign (e.g. arlenes-0928).
create or replace view public.tip_campaign_summary as
select
  coalesce(ev.campaign, 'none')                                            as campaign,
  count(*) filter (where ev.event_type = 'tip_page_view')                  as tip_page_views,
  count(distinct ev.session_id)                                            as unique_sessions,
  count(*) filter (where ev.event_type = 'payment_started')                as stripe_payment_starts,
  count(*) filter (where ev.event_type = 'venmo_clicked')                  as venmo_clicks,
  coalesce(tx.successful_tips, 0)                                          as successful_stripe_tips,
  coalesce(tx.dollars, 0)                                                  as total_dollars_tipped,
  case
    when count(*) filter (where ev.event_type = 'tip_page_view') > 0
    then round(100.0 * coalesce(tx.successful_tips, 0)
      / count(*) filter (where ev.event_type = 'tip_page_view'), 2)
    else 0
  end                                                                     as conversion_pct
from public.tip_events ev
left join (
  select campaign, count(*) as successful_tips, sum(amount_cents) / 100.0 as dollars
  from public.tip_transactions
  where status = 'succeeded'
  group by campaign
) tx on tx.campaign = coalesce(ev.campaign, 'none')
group by coalesce(ev.campaign, 'none'), tx.successful_tips, tx.dollars
order by total_dollars_tipped desc, tip_page_views desc;

grant select on public.tip_funnel_summary   to authenticated, service_role;
grant select on public.tip_daily_summary    to authenticated, service_role;
grant select on public.tip_source_summary   to authenticated, service_role;
grant select on public.tip_campaign_summary to authenticated, service_role;

commit;
