-- Extend the existing content library and connect official music video
-- projects to it. This adds no duplicate project store and preserves imports.
begin;

alter table public.content_items
  add column if not exists recorded_at timestamptz,
  add column if not exists edited_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists platform text,
  add column if not exists music_video_project_id uuid references public.music_video_projects(id) on delete cascade,
  add column if not exists is_reportable boolean not null default true;

create unique index if not exists content_items_music_video_project_uidx
  on public.content_items (music_video_project_id)
  where music_video_project_id is not null;

-- A linked music video is visible in the content library, but excluded from
-- social-content completion counts to avoid counting one project twice.
insert into public.content_items (
  title, category, sub_category, song_name, song_id, recorded, edited,
  post_ready, media_type, purpose, music_video_project_id, is_reportable,
  is_placeholder_date, is_sample, created_at, updated_at
)
select s.title || ' — Official Music Video', 'MUSIC VIDEO', 'OFFICIAL VIDEO',
       s.title, s.id, false, false, false, 'VIDEO', 'Official music video production',
       p.id, false, false, false, now(), now()
from public.music_video_projects p
join public.songs s on s.id = p.song_id
where p.project_type = 'primary'
  and not exists (
    select 1 from public.content_items ci where ci.music_video_project_id = p.id
  );

create or replace view public.content_items_library as
select
  ci.*,
  s.title as canonical_song_title,
  case
    when ci.song_id is not null then 'matched'
    when nullif(trim(ci.song_name), '') is null or upper(trim(ci.song_name)) = 'N/A' then 'unlinked'
    when exists (
      select 1 from public.songs candidate
      where lower(trim(candidate.title)) = lower(trim(ci.song_name))
      group by lower(trim(candidate.title)) having count(*) > 1
    ) then 'ambiguous'
    else 'unmatched'
  end as song_link_status,
  case
    when ci.music_video_project_id is not null then 'Music Video'
    when ci.published is true then 'Posted'
    when ci.post_ready is true and ci.planned_date > current_date and ci.is_placeholder_date is false then 'Scheduled'
    when ci.post_ready is true or (ci.recorded is true and ci.edited is true) then 'Ready'
    when ci.recorded is true and ci.edited is not true then 'To Edit'
    when ci.recorded is not true and ci.edited is not true and ci.post_ready is not true
      and ci.published is not true and nullif(trim(ci.script), '') is null
      and nullif(trim(ci.media_url), '') is null and nullif(trim(ci.source_url), '') is null
      and nullif(trim(ci.caption), '') is null and nullif(trim(ci.text_on_screen), '') is null then 'Idea'
    else 'To Record'
  end as workflow_status,
  p.status as music_video_status,
  p.next_action as music_video_next_action,
  case
    when ci.music_video_project_id is not null then 7
    when ci.published is true then 6
    when ci.post_ready is true and ci.planned_date > current_date and ci.is_placeholder_date is false then 4
    when ci.post_ready is true or (ci.recorded is true and ci.edited is true) then 3
    when ci.recorded is true and ci.edited is not true then 2
    when ci.recorded is not true and ci.edited is not true and ci.post_ready is not true
      and ci.published is not true and nullif(trim(ci.script), '') is null
      and nullif(trim(ci.media_url), '') is null and nullif(trim(ci.source_url), '') is null
      and nullif(trim(ci.caption), '') is null and nullif(trim(ci.text_on_screen), '') is null then 5
    else 1
  end as workflow_priority
from public.content_items ci
left join public.songs s on s.id = ci.song_id
left join public.music_video_projects p on p.id = ci.music_video_project_id;

revoke all on public.content_items_library from public, anon, authenticated;
grant select on public.content_items_library to service_role;
commit;
