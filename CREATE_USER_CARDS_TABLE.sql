-- User cards table for card ownership tracking
-- Safe to run multiple times

begin;

-- Create user_cards table
CREATE TABLE IF NOT EXISTS public.user_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  acquisition_source text,  -- purchase, reward, quest, drop, etc.
  UNIQUE (user_id, card_id)
);

-- Enable Row Level Security
alter table public.user_cards enable row level security;

-- Grant permissions to authenticated users
grant select, insert on table public.user_cards to authenticated;

-- Policy for selecting user cards (users can only see their own cards)
drop policy if exists "Users can select their own cards" on public.user_cards;
create policy "Users can select their own cards"
  on public.user_cards
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy for inserting user cards (users can only insert their own cards)
drop policy if exists "Users can insert their own cards" on public.user_cards;
create policy "Users can insert their own cards"
  on public.user_cards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Create index for performance
create index if not exists user_cards_user_id_idx on public.user_cards(user_id);
create index if not exists user_cards_card_id_idx on public.user_cards(card_id);

commit;