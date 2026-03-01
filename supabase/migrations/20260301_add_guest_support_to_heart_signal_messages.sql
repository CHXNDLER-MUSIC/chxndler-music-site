-- Add guest support to heart_signal_messages so logged-out users can post
-- 1) Make user_id nullable
alter table if exists public.heart_signal_messages
  alter column user_id drop not null;

-- 2) Add guest_id column (uuid) if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'heart_signal_messages'
      and column_name = 'guest_id'
  ) then
    alter table public.heart_signal_messages add column guest_id uuid null;
  end if;
end $$;

-- 3) Add dedupe_key column (uuid) if missing (for optimistic reconciliation)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'heart_signal_messages'
      and column_name = 'dedupe_key'
  ) then
    alter table public.heart_signal_messages add column dedupe_key uuid null;
  end if;
end $$;

-- 4) Ensure at least one of (user_id, guest_id) is present
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.heart_signal_messages'::regclass
      and conname = 'heart_signal_messages_user_or_guest_present'
  ) then
    alter table public.heart_signal_messages
      add constraint heart_signal_messages_user_or_guest_present
      check (user_id is not null or guest_id is not null);
  end if;
end $$;

-- 5) Helpful indexes
create index if not exists idx_heart_signal_messages_guest_id
  on public.heart_signal_messages (guest_id);

create unique index if not exists uq_heart_signal_messages_dedupe_key
  on public.heart_signal_messages (dedupe_key)
  where dedupe_key is not null;

-- 6) RLS: keep public select policy; inserts are performed via service role API route
-- (No changes required here if policy already exists)

