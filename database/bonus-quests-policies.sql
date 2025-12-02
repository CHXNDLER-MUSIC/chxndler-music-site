-- RLS policies and constraints for bonus quests system

-- Ensure RLS is enabled
alter table if exists public.bonus_quests enable row level security;
alter table if exists public.user_bonus_quests enable row level security;

-- Allow public/anon read on bonus_quests so quests can be shown when logged out
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'bonus_quests' and policyname = 'Allow public read'
  ) then
    create policy "Allow public read" on public.bonus_quests
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- User can manage only their own user_bonus_quests rows
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_bonus_quests' and policyname = 'Users can select own rows'
  ) then
    create policy "Users can select own rows" on public.user_bonus_quests
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_bonus_quests' and policyname = 'Users can insert own rows'
  ) then
    create policy "Users can insert own rows" on public.user_bonus_quests
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_bonus_quests' and policyname = 'Users can update own rows'
  ) then
    create policy "Users can update own rows" on public.user_bonus_quests
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_bonus_quests' and policyname = 'Users can delete own rows'
  ) then
    create policy "Users can delete own rows" on public.user_bonus_quests
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- Unique constraint to support idempotency and prevent duplicates
do $$ begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'user_bonus_quests_user_quest_unique'
  ) then
    alter table public.user_bonus_quests
      add constraint user_bonus_quests_user_quest_unique
      unique (user_id, bonus_quest_id);
  end if;
end $$;

-- Helpful indexes
create index if not exists user_bonus_quests_user_id_idx on public.user_bonus_quests(user_id);
create index if not exists user_bonus_quests_bonus_quest_id_idx on public.user_bonus_quests(bonus_quest_id);

