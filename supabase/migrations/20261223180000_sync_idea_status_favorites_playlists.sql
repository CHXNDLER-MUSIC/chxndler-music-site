alter table public.sync_ideas
  add column if not exists status text not null default 'IDEA',
  add column if not exists is_favorite boolean not null default false,
  add column if not exists playlists text not null default '';

update public.sync_ideas
set movies = 'La La Land, 500 Days of Summer, Past Lives, When Harry Met Sally, The Half of It, Before Sunrise, Eternal Sunshine of the Spotless Mind, Nick and Norah''s Infinite Playlist, 10 Things I Hate About You, Scott Pilgrim vs. the World',
    tv_cartoons = 'New Girl, The Office, Friends, How I Met Your Mother, Normal People, Fleabag, Never Have I Ever, Heartstopper, Gilmore Girls, The Summer I Turned Pretty',
    playlists = 'Fresh Finds, Pure Pop Punk, Indie Pop Playlist 2026, Pop Punk Unleashed | Independent Artists on the Rise, Pastel Dreams: Bedroom Pop / Dream Pop / Lo-fi Indie, Pop Punk Playlist!, Unrequited Love Songs, Discover Weekly, Release Radar, Indie Mix',
    updated_at = now()
where song_title in ('WE’RE JUST FRIENDS', 'WE''RE JUST FRIENDS');
