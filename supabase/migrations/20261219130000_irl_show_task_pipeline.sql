-- Automatically create a linked admin checklist whenever a new IRL show is added.
alter table public.admin_tasks
  add column if not exists show_id uuid references public.irl_shows(id) on delete cascade;

create unique index if not exists admin_tasks_show_title_idx
  on public.admin_tasks(show_id, title)
  where show_id is not null;

create index if not exists admin_tasks_show_id_idx
  on public.admin_tasks(show_id)
  where show_id is not null;

create or replace function public.create_irl_show_admin_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  show_task_id uuid;
  show_label text := coalesce(nullif(trim(new.title), ''), nullif(trim(new.location), ''), 'Untitled show');
  task record;
begin
  insert into public.admin_tasks (
    business_area, title, description, task_category, due_at, show_id
  ) values (
    'chxndler',
    'Show: ' || show_label,
    coalesce(nullif(trim(new.location), ''), 'Show planning checklist'),
    'admin',
    new.date::date,
    new.id
  )
  on conflict (show_id, title) where show_id is not null do nothing
  returning id into show_task_id;

  if show_task_id is null then
    select id into show_task_id
    from public.admin_tasks
    where show_id = new.id
      and title = 'Show: ' || show_label
    limit 1;
  end if;

  for task in
    select * from (values
      ('Finalize date - 9/28?', 'admin'),
      ('Cut out Chxndler Cards', 'editing'),
      ('Get Drummer', 'music'),
      ('Get Bass', 'music'),
      ('Update website', 'admin'),
      ('Finalize Set', 'music'),
      ('Band practice 1 - Date?', 'music'),
      ('Band practice 2 - Date?', 'music'),
      ('Get videographer', 'admin'),
      ('Get photographer', 'admin'),
      ('Hang Flyers', 'admin'),
      ('Make promo videos', 'editing'),
      ('Invite people to Event page', 'admin')
    ) as tasks(title, category)
  loop
    insert into public.admin_tasks (
      business_area, title, description, task_category, parent_task_id, show_id
    ) values (
      'chxndler',
      task.title,
      'Automatically added for ' || show_label || '.',
      task.category,
      show_task_id,
      new.id
    )
    on conflict (show_id, title) where show_id is not null do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists create_irl_show_admin_tasks on public.irl_shows;
create trigger create_irl_show_admin_tasks
after insert on public.irl_shows
for each row execute function public.create_irl_show_admin_tasks();

revoke all on function public.create_irl_show_admin_tasks() from public, anon, authenticated;
