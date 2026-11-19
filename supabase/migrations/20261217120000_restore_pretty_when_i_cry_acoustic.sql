-- Restore the released acoustic version to the canonical song catalog so it
-- can appear in collaboration and release views.
insert into public.songs (title, slug, is_released, collaboration_enabled)
values ('AM I PRETTY WHEN I CRY (ACOUSTIC)', 'am-i-pretty-when-i-cry-acoustic', true, true)
on conflict (slug) do nothing;
