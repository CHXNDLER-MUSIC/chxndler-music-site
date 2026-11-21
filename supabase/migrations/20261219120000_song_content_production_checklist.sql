begin;

alter table public.content_items
  add column if not exists content_template_key text,
  add column if not exists content_order integer not null default 0;

-- Refresh the projection so the new checklist identity/order fields are
-- available through the same library view used by both Content surfaces.
drop view if exists public.content_items_library;
create view public.content_items_library as
select
  ci.*,
  s.title as canonical_song_title,
  case
    when ci.song_id is not null then 'matched'
    when nullif(trim(ci.song_name), '') is null or upper(trim(ci.song_name)) = 'N/A' then 'unlinked'
    when exists (select 1 from public.songs candidate where lower(trim(candidate.title)) = lower(trim(ci.song_name)) group by lower(trim(candidate.title)) having count(*) > 1) then 'ambiguous'
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

-- Tag exact existing checklist titles so their progress and metadata are kept.
with candidates as (
  select ci.id, ci.song_id, template.key,
         row_number() over (partition by ci.song_id, template.key order by (ci.music_video_project_id is not null) desc, ci.created_at, ci.id) as position
  from public.content_items ci
  join public.songs s on s.id = ci.song_id
  join (values
    ('official_music_video', 'Official Music Video'),
    ('music_video_short_1', 'Music Video Short 1'),
    ('music_video_short_2', 'Music Video Short 2'),
    ('music_video_short_3', 'Music Video Short 3'),
    ('music_video_short_4', 'Music Video Short 4'),
    ('music_video_short_5', 'Music Video Short 5'),
    ('live_electric_performance', 'Live Electric Performance'),
    ('live_acoustic_performance', 'Live Acoustic Performance'),
    ('vocal_recording_session', 'Vocal Recording / Studio Session'),
    ('performance_lipsync_1', 'Performance / Lip-Sync Video 1'),
    ('performance_lipsync_2', 'Performance / Lip-Sync Video 2'),
    ('performance_lipsync_3', 'Performance / Lip-Sync Video 3'),
    ('creative_location_1', 'Location 1'),
    ('creative_location_2', 'Location 2'),
    ('creative_location_3', 'Location 3'),
    ('behind_the_scenes', 'Behind the Scenes'),
    ('song_story_meaning', 'Song Story / Meaning'),
    ('release_announcement', 'Release Announcement'),
    ('release_day_promo', 'Release Day Promo')
  ) as template(key, title) on lower(trim(ci.title)) = lower(template.title)
       or lower(trim(ci.title)) = lower(s.title || ' — ' || template.title)
       or (ci.music_video_project_id is not null and template.key = 'official_music_video')
  where ci.content_template_key is null
), tagged as (
  select id, song_id, key,
         case key
           when 'official_music_video' then 10 when 'music_video_short_1' then 20
           when 'music_video_short_2' then 30 when 'music_video_short_3' then 40
           when 'music_video_short_4' then 50 when 'music_video_short_5' then 60
           when 'live_electric_performance' then 70 when 'live_acoustic_performance' then 80
           when 'vocal_recording_session' then 90 when 'performance_lipsync_1' then 100
           when 'performance_lipsync_2' then 110 when 'performance_lipsync_3' then 120
           when 'creative_location_1' then 130 when 'creative_location_2' then 140
           when 'creative_location_3' then 150 when 'behind_the_scenes' then 160
           when 'song_story_meaning' then 170 when 'release_announcement' then 180
           when 'release_day_promo' then 190 else 10000 end as template_order
  from candidates where position = 1
)
update public.content_items ci
set content_template_key = tagged.key,
    content_order = tagged.template_order,
    updated_at = now()
from tagged
where ci.id = tagged.id;

create unique index if not exists content_items_song_template_uidx
  on public.content_items(song_id, content_template_key)
  where song_id is not null and content_template_key is not null;
create index if not exists content_items_song_content_order_idx
  on public.content_items(song_id, content_order, created_at);

create or replace function public.ensure_song_content_checklist(target_song_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare song_title text;
begin
  select title into song_title from public.songs where id = target_song_id;
  if song_title is null then return; end if;
  insert into public.content_items (
    title, category, sub_category, song_name, song_id, recorded, edited, post_ready,
    published, media_type, purpose, content_template_key, content_order,
    music_video_project_id, is_reportable, is_placeholder_date, is_sample,
    created_at, updated_at
  )
  select song_title || ' — ' || item.title, item.category, item.sub_category,
         song_title, target_song_id, false, false, false, false, 'VIDEO', item.purpose,
         item.key, item.sort_order,
         case when item.key = 'official_music_video' then (
           select p.id from public.music_video_projects p
           where p.song_id = target_song_id and p.project_type = 'primary' limit 1
         ) else null end,
         true, false, false, now(), now()
  from (values
    ('official_music_video', 'Official Music Video', 'Music Video', 'Official Video', 'Official music video', 10),
    ('music_video_short_1', 'Music Video Short 1', 'Music Video', 'Shorts', 'Short cut from the official music video', 20),
    ('music_video_short_2', 'Music Video Short 2', 'Music Video', 'Shorts', 'Short cut from the official music video', 30),
    ('music_video_short_3', 'Music Video Short 3', 'Music Video', 'Shorts', 'Short cut from the official music video', 40),
    ('music_video_short_4', 'Music Video Short 4', 'Music Video', 'Shorts', 'Short cut from the official music video', 50),
    ('music_video_short_5', 'Music Video Short 5', 'Music Video', 'Shorts', 'Short cut from the official music video', 60),
    ('live_electric_performance', 'Live Electric Performance', 'Live Performance', 'Electric', 'Live electric performance', 70),
    ('live_acoustic_performance', 'Live Acoustic Performance', 'Live Performance', 'Acoustic', 'Live acoustic performance', 80),
    ('vocal_recording_session', 'Vocal Recording / Studio Session', 'Studio', 'Vocals', 'Vocal recording or studio session', 90),
    ('performance_lipsync_1', 'Performance / Lip-Sync Video 1', 'Performance', 'Performance', 'Performance or lip-sync video', 100),
    ('performance_lipsync_2', 'Performance / Lip-Sync Video 2', 'Performance', 'Performance', 'Performance or lip-sync video', 110),
    ('performance_lipsync_3', 'Performance / Lip-Sync Video 3', 'Performance', 'Performance', 'Performance or lip-sync video', 120),
    ('creative_location_1', 'Location 1', 'Creative Locations', 'Location 1', 'Creative location video', 130),
    ('creative_location_2', 'Location 2', 'Creative Locations', 'Location 2', 'Creative location video', 140),
    ('creative_location_3', 'Location 3', 'Creative Locations', 'Location 3', 'Creative location video', 150),
    ('behind_the_scenes', 'Behind the Scenes', 'Behind the Scenes', 'Behind the Scenes', 'Behind the scenes content', 160),
    ('song_story_meaning', 'Song Story / Meaning', 'Song Story', 'Song Story', 'Story and meaning behind the song', 170),
    ('release_announcement', 'Release Announcement', 'Release', 'Announcement', 'Release announcement', 180),
    ('release_day_promo', 'Release Day Promo', 'Release', 'Release Day', 'Release day promotion', 190)
  ) as item(key, title, category, sub_category, purpose, sort_order)
  on conflict (song_id, content_template_key) where song_id is not null and content_template_key is not null do nothing;
end;
$$;
revoke all on function public.ensure_song_content_checklist(uuid) from public, anon, authenticated;

-- Existing primary projects own their official video content row. Link the
-- checklist row when present, while preserving its production metadata.
update public.content_items ci
set music_video_project_id = p.id,
    is_reportable = false,
    updated_at = now()
from public.music_video_projects p
where p.song_id = ci.song_id and p.project_type = 'primary'
  and ci.content_template_key = 'official_music_video'
  and ci.music_video_project_id is null;

select public.ensure_song_content_checklist(id) from public.songs;

create or replace function public.create_song_content_checklist_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.ensure_song_content_checklist(new.id);
  return new;
end;
$$;
revoke all on function public.create_song_content_checklist_trigger() from public, anon, authenticated;
drop trigger if exists create_song_content_checklist_after_insert on public.songs;
create trigger create_song_content_checklist_after_insert
after insert on public.songs
for each row execute function public.create_song_content_checklist_trigger();

commit;
