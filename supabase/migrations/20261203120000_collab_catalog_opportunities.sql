-- Keep production completion separate from release metadata and opportunities.
alter table public.songs
  add column if not exists audio_status text,
  add column if not exists collaboration_opportunities text[] not null default '{}',
  add column if not exists video_concept text not null default '';

update public.songs
set audio_status = case
  when is_released then 'Released'
  when workflow_stage = 'Ready' then 'Final'
  when workflow_stage in ('Writing','Recording','Mixing','Mastering') then 'In Progress'
  else 'Demo'
end
where audio_status is null;

update public.songs
set collaboration_opportunities = array_remove(array[
  case when 'Feature / Vocals' = any(collab_interests) then 'feature' end,
  case when 'Music Video' = any(collab_interests) then 'video' end,
  case when 'Remix' = any(collab_interests) then 'remix' end
], null)
where cardinality(collaboration_opportunities) = 0 and coalesce(cardinality(collab_interests), 0) > 0;
update public.songs set collaboration_opportunities = array['feature']
where ready_for_collab is true and cardinality(collaboration_opportunities) = 0;

alter table public.songs alter column audio_status set default 'Demo';
alter table public.songs alter column audio_status set not null;
alter table public.songs drop constraint if exists songs_audio_status_check;
alter table public.songs add constraint songs_audio_status_check check (audio_status in ('Demo','In Progress','Final','Released'));
alter table public.songs drop constraint if exists songs_collaboration_opportunities_check;
alter table public.songs add constraint songs_collaboration_opportunities_check check (collaboration_opportunities <@ array['feature','video','remix']::text[]);

-- Reuse personalized invite rows for catalog, video catalog, and song-specific links.
alter table public.collaboration_invites
  add column if not exists invite_scope text not null default 'catalog',
  add column if not exists invitee_email text;
alter table public.collaboration_invites drop constraint if exists collaboration_invites_invite_scope_check;
alter table public.collaboration_invites add constraint collaboration_invites_invite_scope_check
  check (invite_scope in ('catalog','video','song'));
update public.collaboration_invites set invite_scope = 'song' where song_id is not null and invite_scope = 'catalog';

-- Audio is served via same-origin authorization routes after this bucket is private.
update storage.buckets set public = false where id = 'tracks';

alter table public.music_video_projects
  add column if not exists collaboration_stage text not null default 'Seeking';
alter table public.music_video_projects drop constraint if exists music_video_projects_collaboration_stage_check;
alter table public.music_video_projects add constraint music_video_projects_collaboration_stage_check
  check (collaboration_stage in ('Seeking','Discussing','Confirmed','Production','Delivered'));
