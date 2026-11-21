alter table public.admin_tasks
  add column if not exists task_category text not null default 'admin',
  add column if not exists parent_task_id uuid references public.admin_tasks(id) on delete cascade;

alter table public.admin_tasks drop constraint if exists admin_tasks_task_category_check;
alter table public.admin_tasks add constraint admin_tasks_task_category_check
  check (task_category in ('music', 'editing', 'admin'));
create index if not exists admin_tasks_parent_idx on public.admin_tasks(parent_task_id);

create or replace function public.seed_song_schedule_tasks()
returns trigger
language plpgsql
as $$
declare
  task record;
  parent_id uuid;
  stage jsonb := coalesce(new.production_stages, '{}'::jsonb);
begin
  if new.slug is null then return new; end if;

  for task in select * from (values
    ('Write lyrics ' || new.title, 'music', coalesce((stage->>'lyrics')::boolean, false) or coalesce((stage->>'write')::boolean, false)),
    ('Record vocals ' || new.title, 'music', coalesce((stage->>'recorded')::boolean, false) or coalesce((stage->>'record')::boolean, false)),
    ('Mix and master ' || new.title, 'music', coalesce((stage->>'mixed')::boolean, false) or coalesce((stage->>'mix')::boolean, false)),
    ('Make cover art ' || new.title, 'editing', false),
    ('Create Spotify Canvas ' || new.title, 'editing', coalesce((stage->>'spotify_canvas')::boolean, false)),
    ('Create Sky video ' || new.title, 'editing', coalesce((stage->>'sky')::boolean, false) or nullif(new.sky_video_url, '') is not null),
    ('Create CHXNDLER Card ' || new.title, 'admin', coalesce((stage->>'chxndler_card')::boolean, false)),
    ('Create Music Video ' || new.title, 'editing', coalesce((stage->>'music_video_released')::boolean, false) or coalesce((stage->>'music_video')::boolean, false) or nullif(new.youtube_music_video_url, '') is not null or exists (select 1 from public.music_video_projects project where project.song_id = new.id and (project.project_type is null or project.project_type = 'primary'))),
    ('Make song layback ' || new.title, 'music', false),
    ('Edit video after recording ' || new.title, 'editing', false),
    ('Edit full music video ' || new.title, 'editing', false),
    ('Edit music video shorts ' || new.title, 'editing', false)
  ) as x(title, category, complete)
  loop
    insert into public.admin_tasks (business_area, song_id, title, description, task_category, status)
    values ('unreleased_song', new.id, task.title, 'Part of this song’s master schedule.', task.category,
      case when task.complete then 'done' else 'todo' end)
    on conflict (song_id, title) where song_id is not null do update
      set task_category = excluded.task_category,
          status = case when task.complete then 'done'
                        when public.admin_tasks.status = 'done' and task.title like 'Create %' then 'todo'
                        else public.admin_tasks.status end,
          updated_at = now();
  end loop;

  -- Break cover art into the vertical and horizontal artwork/animation work.
  select id into parent_id from public.admin_tasks where song_id = new.id and title = 'Make cover art ' || new.title;
  insert into public.admin_tasks (business_area, song_id, title, description, task_category, parent_task_id)
  values
    ('unreleased_song', new.id, 'Create vertical cover art image', 'Prepare the vertical artwork for Canvas and short-form use.', 'editing', parent_id),
    ('unreleased_song', new.id, 'Animate vertical cover art', 'Animate the vertical cover image.', 'editing', parent_id),
    ('unreleased_song', new.id, 'Create horizontal cover art image', 'Prepare the horizontal artwork for the song visual.', 'editing', parent_id),
    ('unreleased_song', new.id, 'Animate horizontal cover art for Sky', 'Animate the horizontal artwork to create the Sky video.', 'editing', parent_id)
  on conflict (song_id, title) where song_id is not null do update
    set parent_task_id = excluded.parent_task_id, task_category = excluded.task_category;

  return new;
end;
$$;

drop trigger if exists seed_song_schedule_tasks on public.songs;
create trigger seed_song_schedule_tasks
after insert or update of title, slug, production_stages, sky_video_url, youtube_music_video_url
on public.songs for each row execute function public.seed_song_schedule_tasks();

-- Seed tasks for the existing catalog. The existing profile task remains intact.
update public.songs set title = title where slug is not null;
