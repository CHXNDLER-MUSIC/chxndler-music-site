-- Keep the published ALONE video attached to its song record so public release
-- pages and collaboration views can embed it consistently.
update public.songs
set youtube_music_video_url = 'https://www.youtube.com/watch?v=ZTE6aFi_cqk'
where slug = 'alone';

-- Ensure the released acoustic version is present in the canonical catalog.
insert into public.songs (title, slug, is_released, collaboration_enabled)
values ('AM I PRETTY WHEN I CRY (ACOUSTIC)', 'am-i-pretty-when-i-cry-acoustic', true, true)
on conflict (slug) do update
set is_released = true,
    collaboration_enabled = true;
