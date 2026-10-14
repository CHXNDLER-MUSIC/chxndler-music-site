-- Phase 1 security review: READ-ONLY diagnostics.
-- Run in Supabase Dashboard -> SQL Editor. Nothing here changes data or policies.
-- Share the output so the fixes can be written against the real live policies
-- (the .sql files in this repo have drifted from production).

-- 1. Every RLS policy on the tables that hold fan data or HeartCoins.
--    Look for: roles = {public} or {anon}, and "qual" that is `true` or that
--    lets one user see another user's row.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles', 'orders', 'heartcoin_transactions', 'user_active_boosts',
    'user_relics', 'user_badges', 'user_cards', 'soul_journal_entries',
    'heart_signal_messages', 'heart_signal_guest_messages', 'sessions',
    'signal_signups', 'tip_events', 'tip_sessions', 'song_poll_votes'
  )
order by tablename, cmd, policyname;

-- 2. Is RLS actually enabled on each of those tables?
select relname as table, relrowsecurity as rls_enabled, relforcerowsecurity as rls_forced
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'profiles', 'orders', 'heartcoin_transactions', 'user_active_boosts',
    'user_relics', 'user_badges', 'user_cards', 'soul_journal_entries',
    'heart_signal_messages', 'heart_signal_guest_messages', 'sessions',
    'tip_events', 'tip_sessions', 'song_poll_votes'
  )
order by relname;

-- 3. Table/column privileges for the browser roles on profiles.
--    If anon/authenticated have table-wide SELECT/UPDATE, every column
--    (email, phone, heartcoin_balance, ...) is exposed to whatever rows the
--    policies allow.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'profiles'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- 4. Can a signed-in fan INSERT their own heartcoin_transactions or UPDATE
--    their own heartcoin_balance directly from the browser? (If the policies
--    from step 1 allow it, the HeartCoin economy can be edited client-side,
--    regardless of the API fixes.)
select tablename, policyname, cmd, roles, with_check
from pg_policies
where schemaname = 'public'
  and ((tablename = 'heartcoin_transactions' and cmd in ('INSERT', 'ALL'))
    or (tablename = 'profiles' and cmd in ('UPDATE', 'ALL')));

-- 5. Triggers that might guard balances (e.g. recompute heartcoin_balance
--    from transactions, or block direct balance edits).
select event_object_table as table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('profiles', 'heartcoin_transactions')
order by 1, 2;
