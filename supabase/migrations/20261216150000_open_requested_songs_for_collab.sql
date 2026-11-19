-- These unreleased songs were called out for the Open for Collab catalog.
update public.songs
set ready_for_collab = true,
    collaboration_enabled = true
where slug in (
  'bad-idea',
  'copycat',
  'like-this',
  'my-mom-thinks-im-famous'
);
