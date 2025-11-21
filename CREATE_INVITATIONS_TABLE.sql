-- Create invitations table to track heart signal invitations
-- Safe to run multiple times

begin;

-- Create table for tracking invitations/heart signals
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid references auth.users(id) on delete cascade,
  recipient_email text not null,
  personal_message text,
  heart_link text,
  invitation_token text,
  status text not null default 'sent', -- sent, opened, joined, failed
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add indexes for better performance
create index if not exists invitations_inviter_id_idx on public.invitations(inviter_id);
create index if not exists invitations_recipient_email_idx on public.invitations(recipient_email);
create index if not exists invitations_status_idx on public.invitations(status);
create index if not exists invitations_created_at_idx on public.invitations(created_at);

-- Enable Row Level Security
alter table public.invitations enable row level security;

-- Grant permissions
grant usage on schema public to authenticated;
grant select, insert, update on table public.invitations to authenticated;

-- Policies (re-create to ensure idempotency)
drop policy if exists "Users can view invitations they sent" on public.invitations;
drop policy if exists "Users can create invitations" on public.invitations;
drop policy if exists "Users can update their own invitations" on public.invitations;

create policy "Users can view invitations they sent"
  on public.invitations
  for select
  to authenticated
  using (auth.uid() = inviter_id);

create policy "Users can create invitations"
  on public.invitations
  for insert
  to authenticated
  with check (auth.uid() = inviter_id);

create policy "Users can update their own invitations"
  on public.invitations
  for update
  to authenticated
  using (auth.uid() = inviter_id)
  with check (auth.uid() = inviter_id);

commit;