create table if not exists public.song_outreach_status (
  id uuid primary key default gen_random_uuid(),
  song text not null,
  category text not null check (category in ('BLOGS & PRESS', 'INFLUENCER', 'PLAYLIST', 'RADIO', 'SYNC')),
  pitch text not null default '',
  complete boolean not null default false,
  meaning_of_song text not null default '',
  updated_at timestamptz not null default now(),
  unique (song, category)
);

create index if not exists song_outreach_status_song_idx on public.song_outreach_status (song);
create index if not exists song_outreach_status_category_idx on public.song_outreach_status (category);
alter table public.song_outreach_status enable row level security;
revoke all on public.song_outreach_status from anon, authenticated;
grant all on public.song_outreach_status to service_role;

with songs(song) as (values
  ('ALONE'), ('ALWAYS ON MY MIND'), ('BABY'), ('BE MY BEE'), ('COLLIDE'),
  ('COLORS OF OUR HOME'), ('FEELING THIS'), ('HOME'), ('HOUSE PARTY'),
  ('HOUSE PARTY (ACOUSTIC)'), ('I MIGHT FALL IN LOVE WITH YOU'), ('LETTING GO'),
  ('LITTLE BLACK HEART'), ('LOVE'), ('MR.BRIGHTSIDE'), ('OCEAN GIRL'),
  ('OCEAN GIRL (ACOUSTIC)'), ('OCEAN GIRL (REMIX)'), ('PARIS'), ('POKEMON'),
  ('SOMEBODY TO LOVE'), ('TIENES UN AMIGO'), ('WE’RE JUST FRIENDS'),
  ('WE’RE JUST FRIENDS (ACOUSTIC)'), ('GAME BOY HEART (ゲームボーイの心)'),
  ('KID FOREVER (永遠の子供)'), ('AMERICAN DREAM'), ('PINK MOON'), ('BELIEVE IN ME')
), categories(category) as (values
  ('BLOGS & PRESS'), ('INFLUENCER'), ('PLAYLIST'), ('RADIO'), ('SYNC')
)
insert into public.song_outreach_status (song, category)
select songs.song, categories.category from songs cross join categories
on conflict (song, category) do nothing;

update public.song_outreach_status set pitch = case (song, category)
  when ('BABY','BLOGS & PRESS') then 'Revisit ''Baby'' through an electro-pop lens in our cover that blends shimmering production with a familiar refrain. It’s a compelling story for music blogs: how a classic can evolve into something dreamier and cinematic. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('BABY','INFLUENCER') then 'TikTok creators can give new life to ''Baby'' with our electropop version: ideal for dance challenges, transformation edits, or throwback-themed content. The blend of familiarity and modern vibes invites engagement. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('BABY','PLAYLIST') then 'Add a nostalgic twist to your playlist with our electropop cover of ''Baby.'' It blends the memorable hook you know with modern synths and atmospheric vibes, making it a standout for pop and indie playlists. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('BABY','RADIO') then 'Turn up the dial with our electric cover of ''Baby,'' which infuses Justin Bieber’s hit with a dreamy alt-pop aesthetic. Its infectious beat and nostalgic charm suit radio shows looking for a cross-genre crowd-pleaser. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('BABY','SYNC') then 'Our electric pop cover of ''Baby'' reinvents a classic with sparkling synths and fresh alt-pop energy. It’s perfect for scenes that need a touch of nostalgia wrapped in a modern sheen, whether in films, ads, or games. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('OCEAN GIRL','BLOGS & PRESS') then 'Step into CHXNDLER’s HEARTVERSE with ''Ocean Girl,'' a track that combines fantasy, nostalgia, and romantic ocean imagery. Inspired by the pull of the tide and the idea of trusting love to return, it offers a unique story in a rich sonic palette. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('OCEAN GIRL','INFLUENCER') then 'Ocean Girl creates the perfect vibe for beachy memories, glow-ups, and heartfelt stories. With its dreamy production and theme of returning love, it’s ready to soundtrack your next video challenge or trend. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('OCEAN GIRL','PLAYLIST') then 'Ocean Girl feels like a summer night on the beach, blending nostalgic alt-pop vibes with heartfelt lyrics. Fans of The 1975 and Porter Robinson will love its lush production and dreamy chorus, making it ideal for indie and vibe playlists. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('OCEAN GIRL','RADIO') then 'From the shores of Bethany Beach comes ''Ocean Girl,'' a cinematic alt-pop single that feels both familiar and fresh. Its emotional storytelling and dreamy synths are perfect for college and indie stations looking to spotlight new voices in the genre. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('OCEAN GIRL','SYNC') then 'Ocean Girl is a dreamy, cinematic alt-pop track that gently builds like waves at sunset. Its nostalgic synths and ocean imagery make it a perfect fit for scenes about letting go, introspective montages, or emotional resolutions. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('TIENES UN AMIGO','BLOGS & PRESS') then 'Step into CHXNDLER’s HEARTVERSE with ''Ocean Girl,'' a track that combines fantasy, nostalgia, and romantic ocean imagery. Inspired by the pull of the tide and the idea of trusting love to return, it offers a unique story in a rich sonic palette. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('TIENES UN AMIGO','INFLUENCER') then 'Ocean Girl creates the perfect vibe for beachy memories, glow-ups, and heartfelt stories. With its dreamy production and theme of returning love, it’s ready to soundtrack your next video challenge or trend. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('TIENES UN AMIGO','PLAYLIST') then 'Ocean Girl feels like a summer night on the beach, blending nostalgic alt-pop vibes with heartfelt lyrics. Fans of The 1975 and Porter Robinson will love its lush production and dreamy chorus, making it ideal for indie and vibe playlists. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('TIENES UN AMIGO','RADIO') then 'From the shores of Bethany Beach comes ''Ocean Girl,'' a cinematic alt-pop single that feels both familiar and fresh. Its emotional storytelling and dreamy synths are perfect for college and indie stations looking to spotlight new voices in the genre. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  when ('TIENES UN AMIGO','SYNC') then 'Ocean Girl is a dreamy, cinematic alt-pop track that gently builds like waves at sunset. Its nostalgic synths and ocean imagery make it a perfect fit for scenes about letting go, introspective montages, or emotional resolutions. — Sofia | on behalf of the ALIENS CHXNDLER''s group'
  else pitch end,
meaning_of_song = case song
  when 'COLORS OF OUR HOME' then 'Trying to go through life alone then realize that life is much better when you are with someone you love, they let you see the color in life. Feeling fearless when you are with the person you love'
  when 'FEELING THIS' then 'Chaotic, sexual encounter that was brief but left an impression.'
  when 'HOME' then 'Looking for someone to fill the hole of your loneliness and realizing you are not with the right person; the mistake is thinking it is about them when it is really about you. It is okay to fall back down to yourself and recognize you are enough of a home for yourself.'
  when 'I MIGHT FALL IN LOVE WITH YOU' then 'Finding love in routine activities like watching cartoons, dancing, and cooking in the kitchen; seeing true strength of character when faced with challenge; holding onto childish wonder while wanting to grow together.'
  when 'LETTING GO' then 'Letting go of expectations from society, family, friends, and myself. Living freely, by the beach or in the woods, and not being afraid to be seen.'
  when 'SOMEBODY TO LOVE' then 'Looking to love someone in the way that feels right and realizing the love you thought you found was not what you were looking for. They wanted to settle down and have kids while you wanted wild and adventurous.'
  when 'TIENES UN AMIGO' then 'Meeting a friend far away from home and feeling a special connection as he was another alien. Knowing that one day we will see each other again.'
  when 'WE’RE JUST FRIENDS' then 'WE’RE JUST FRIENDS explores the blurred lines between friendship and romance. The song captures intimate moments from stargazing to late-night conversations that feel like more than platonic companionship.'
  when 'GAME BOY HEART (ゲームボーイの心)' then 'Wanting to stay a kid and live inside the fantasy world of Pokemon.'
  when 'KID FOREVER (永遠の子供)' then 'Wanting to stay a kid forever and not wanting to grow up to have a boring life, centered around playing Pokemon and parents not approving of life decisions.'
  when 'BELIEVE IN ME' then 'Wanting my mother to believe in me and in following my passion for music. She was always my biggest cheerleader and now she is not supporting me in my journey.'
  when 'PINK MOON' then 'A late-night confession about spiraling through addiction and numbness, then finding a rare moment of clarity and connection with someone whose love makes you want to try.'
  else meaning_of_song end
where complete = false;
