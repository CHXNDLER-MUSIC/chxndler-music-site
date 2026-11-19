-- Restore LIKE THIS to the canonical song tracker. Practice key/capo/shape
-- metadata is already part of the song practice setup catalog.
insert into public.songs (title, slug, is_released, collaboration_enabled, musical_key, capo_fret, chord_shape)
values ('LIKE THIS', 'like-this', false, false, 'B', 4, 'G')
on conflict (slug) do nothing;
