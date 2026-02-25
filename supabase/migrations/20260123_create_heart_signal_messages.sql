-- 0) Prereqs (gen_random_uuid)
create extension if not exists pgcrypto;

-- 1) Create the table if it doesn't exist
create table if not exists public.heart_signal_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- who sent it
  user_id uuid not null references auth.users(id) on delete cascade,

  -- sender display name
  username text not null default 'ALIEN',

  -- message payload
  message text not null,

  -- system message flag (join/leave notifications)
  is_system boolean not null default false,

  -- optional grouping (room/thread). Keep nullable if you're not using rooms yet.
  room_id text null,

  -- client-generated id for idempotency (prevents duplicates if client retries)
  client_nonce uuid null,

  -- reaction counts (denormalized for fast reads)
  heart_count integer not null default 0,
  water_count integer not null default 0,
  lightning_count integer not null default 0,
  darkness_count integer not null default 0,
  alien_count integer not null default 0
);

-- 2) Add missing columns / defaults if the table already existed (safe-ish alterations)
alter table public.heart_signal_messages
  alter column id set default gen_random_uuid();

alter table public.heart_signal_messages
  alter column created_at set default now();

-- Ensure required columns are NOT NULL (only if they exist; if this fails, tell me the error)
alter table public.heart_signal_messages
  alter column user_id set not null;

alter table public.heart_signal_messages
  alter column message set not null;

-- 3) Idempotency: if you use client_nonce, enforce uniqueness when present
create unique index if not exists uq_heart_signal_messages_client_nonce
on public.heart_signal_messages (client_nonce)
where client_nonce is not null;

-- Helpful indexes
create index if not exists idx_heart_signal_messages_created_at
on public.heart_signal_messages (created_at desc);

create index if not exists idx_heart_signal_messages_room_created_at
on public.heart_signal_messages (room_id, created_at desc);

create index if not exists idx_heart_signal_messages_user_created_at
on public.heart_signal_messages (user_id, created_at desc);

-- 4) RLS
alter table public.heart_signal_messages enable row level security;

-- Read: allow any authenticated user to read messages (simple mode)
drop policy if exists "read heart signal messages" on public.heart_signal_messages;
create policy "read heart signal messages"
on public.heart_signal_messages
for select
to authenticated
using (true);

-- Insert: allow authenticated user to insert as themselves
drop policy if exists "insert own heart signal messages" on public.heart_signal_messages;
create policy "insert own heart signal messages"
on public.heart_signal_messages
for insert
to authenticated
with check (auth.uid() = user_id);

-- Update/Delete: optional, but usually you want user to edit/delete only their own
drop policy if exists "update own heart signal messages" on public.heart_signal_messages;
create policy "update own heart signal messages"
on public.heart_signal_messages
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own heart signal messages" on public.heart_signal_messages;
create policy "delete own heart signal messages"
on public.heart_signal_messages
for delete
to authenticated
using (auth.uid() = user_id);
