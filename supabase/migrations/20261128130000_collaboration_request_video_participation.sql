alter table public.collaboration_requests
  add column if not exists music_video_participation text
  check (music_video_participation is null or music_video_participation in ('interested', 'not_interested'));
