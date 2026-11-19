-- Allow catalog invite holders to submit original songwriting ideas without
-- attaching them to an existing song.
alter table public.collaboration_requests
  alter column song_id drop not null;
