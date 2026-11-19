-- Restore songs that already have practice setups and lyrics, but were absent
-- from the canonical song tracker.
insert into public.songs (title, slug, is_released, collaboration_enabled, musical_key, capo_fret, chord_shape)
values
  ('ALMOST HUMAN', 'almost-human', false, false, 'A#', 3, 'G'),
  ('WHO TAUGHT YOU TO LOVE', 'who-taught-you-to-love', false, false, 'D#', 3, 'C'),
  ('SOMEBODY TOO', 'somebody-too', false, false, 'C', 0, 'C'),
  ('MY MOM THINKS I''M FAMOUS', 'my-mom-thinks-im-famous', false, false, 'A', 2, 'G'),
  ('BAD IDEA', 'bad-idea', false, false, 'G', 0, 'G'),
  ('COPYCAT', 'copycat', false, false, 'G', 0, 'G')
on conflict (slug) do nothing;
