-- Keep actionable production and release tasks linked to their existing songs.
create or replace function public.sync_song_workflow_tasks()
returns trigger
language plpgsql
as $$
declare
  stage jsonb := coalesce(new.production_stages, '{}'::jsonb);
  task record;
begin
  if new.slug is null then
    return new;
  end if;

  for task in
    select * from (values
      ('Write lyrics ' || new.title, coalesce((stage->>'lyrics')::boolean, false) or coalesce((stage->>'write')::boolean, false)),
      ('Record lyrics ' || new.title, coalesce((stage->>'recorded')::boolean, false) or coalesce((stage->>'record')::boolean, false)),
      ('Mix ' || new.title, coalesce((stage->>'mixed')::boolean, false) or coalesce((stage->>'mix')::boolean, false)),
      ('Create Spotify Canvas ' || new.title, coalesce((stage->>'spotify_canvas')::boolean, false)),
      ('Create Sky video ' || new.title, coalesce((stage->>'sky')::boolean, false) or nullif(new.sky_video_url, '') is not null),
      ('Create CHXNDLER Card ' || new.title, coalesce((stage->>'chxndler_card')::boolean, false)),
      ('Create Music Video ' || new.title, coalesce((stage->>'music_video_released')::boolean, false) or coalesce((stage->>'music_video')::boolean, false) or nullif(new.youtube_music_video_url, '') is not null or exists (select 1 from public.music_video_projects project where project.song_id = new.id and (project.project_type is null or project.project_type = 'primary')))
    ) as tasks(title, complete)
  loop
    if task.complete then
      update public.admin_tasks
      set status = 'done', updated_at = now()
      where song_id = new.id and title = task.title and status <> 'done';
    else
      insert into public.admin_tasks (business_area, song_id, title, description, status)
      values ('unreleased_song', new.id, task.title, 'Generated from this song’s workflow status.', 'todo')
      on conflict (song_id, title) where song_id is not null
      do update set status = case when public.admin_tasks.status = 'done' then 'todo' else public.admin_tasks.status end,
                    updated_at = now();
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists sync_song_workflow_tasks on public.songs;
create trigger sync_song_workflow_tasks
after insert or update of title, slug, production_stages, sky_video_url, youtube_music_video_url
on public.songs
for each row execute function public.sync_song_workflow_tasks();

-- Backfill missing tasks for every existing catalog song.
update public.songs
set production_stages = coalesce(production_stages, '{}'::jsonb)
where slug is not null;

create or replace function public.refresh_song_video_workflow_tasks()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.song_id is distinct from new.song_id then
    update public.songs
    set production_stages = coalesce(production_stages, '{}'::jsonb)
    where id = old.song_id;
  end if;
  update public.songs
  set production_stages = coalesce(production_stages, '{}'::jsonb)
  where id = case when tg_op = 'DELETE' then old.song_id else new.song_id end;
  return null;
end;
$$;

drop trigger if exists refresh_song_video_workflow_tasks on public.music_video_projects;
create trigger refresh_song_video_workflow_tasks
after insert or update or delete
on public.music_video_projects
for each row execute function public.refresh_song_video_workflow_tasks();
