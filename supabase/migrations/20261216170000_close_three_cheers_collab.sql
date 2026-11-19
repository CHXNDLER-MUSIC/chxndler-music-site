update public.songs
set ready_for_collab = false,
    collaboration_enabled = false
where slug = 'three-cheers-for-five-years';
