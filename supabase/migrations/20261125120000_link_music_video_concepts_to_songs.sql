-- Make the song associated with each concept directly available in the table.
-- Concepts inherit their song from their parent music video project.
alter table public.music_video_concepts
  add column if not exists song_id uuid references public.songs(id) on delete set null;

update public.music_video_concepts as concepts
set song_id = projects.song_id
from public.music_video_projects as projects
where concepts.project_id = projects.id
  and concepts.song_id is distinct from projects.song_id;

create index if not exists music_video_concepts_song_idx
  on public.music_video_concepts(song_id);
