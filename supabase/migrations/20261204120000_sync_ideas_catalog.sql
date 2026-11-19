-- Store creative sync research independently from pitches and placements.
-- Song IDs link to canonical artist songs when a title/slug match exists; the
-- original title and full research remain preserved even if no match exists.
create table if not exists public.sync_ideas (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references public.songs(id) on delete set null,
  song_title text not null unique,
  core_emotion text not null default '',
  big_category text not null default '',
  movies text not null default '',
  tv_cartoons text not null default '',
  anime text not null default '',
  text_hooks text not null default '',
  scenes_to_search text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sync_ideas_song_idx on public.sync_ideas(song_id);
alter table public.sync_ideas enable row level security;
revoke all on public.sync_ideas from anon, authenticated;
grant all on public.sync_ideas to service_role;

-- Idempotently import all 33 ideas and every reference/hook from the prior UI.
insert into public.sync_ideas (song_title, core_emotion, big_category, movies, tv_cartoons, anime, text_hooks, scenes_to_search)
values
  ('WE''RE JUST FRIENDS', 'Loving someone who might never choose you', 'Unrequited Love', 'La La Land, 500 Days of Summer', 'The Office, New Girl', 'Your Name', 'Have you ever loved someone at the wrong time?', 'Friends almost kissing, staring at each other, late night talks'),
  ('BE MY BEE', 'Trust betrayed after opening your heart', 'Heartbreak', 'Eternal Sunshine', 'Normal People', 'Toradora', 'The person I fell for never existed.', 'First dates, betrayal reveals, text messages'),
  ('SOMEBODY TO LOVE', 'Looking for a love that matches your soul', 'Longing', 'Before Sunrise', 'How I Met Your Mother', 'Nana', 'Not all love stories are meant to last.', 'Soulmate moments, walking together'),
  ('LOVE ME', 'Fear you''ll be abandoned if you fail', 'Insecurity', 'Tick Tick Boom', 'Ted Lasso', 'Blue Period', 'Would you still love me if I never made it?', 'Auditions, rejection, failure'),
  ('HOME', 'Becoming your own safe place', 'Self Acceptance', 'Good Will Hunting', 'Bluey', 'March Comes in Like a Lion', 'The person I was searching for was me.', 'Looking in mirrors, leaving toxic relationships'),
  ('COLORS OF OUR HOME', 'Love makes life brighter', 'Safe Love', 'Up', 'Bob''s Burgers', 'Your Name', 'You brought color back into my world.', 'Before/after happiness scenes'),
  ('I MIGHT FALL IN LOVE WITH YOU', 'Magic hidden inside ordinary life', 'Nostalgic Love', 'About Time', 'Bluey', 'Whisper of the Heart', 'Love looks a lot like cartoons and pancakes.', 'Cooking together, dancing in kitchen'),
  ('LOVE', 'Pure connection', 'Safe Love', 'Before Sunrise', 'Heartstopper', 'Horimiya', 'Nothing dramatic. Just love.', 'Hand holding, laughing together'),
  ('I WOULD DIE FOR YOUR LOVE', 'Complete devotion', 'Intense Love', 'Titanic', 'Vampire Diaries', 'Clannad', 'Some people become your entire world.', 'Sacrifice scenes'),
  ('ALONE', 'Invisible in a crowded world', 'Loneliness', 'Her', 'BoJack Horseman', 'A Silent Voice', 'Nobody noticed I was disappearing.', 'Subway scenes, city walking alone'),
  ('LITTLE BLACK HEART', 'Wondering when you stopped caring', 'Emotional Numbness', 'Fight Club', 'Mr Robot', 'Welcome to NHK', 'When did I become this person?', 'Looking exhausted, empty apartments'),
  ('AM I PRETTY WHEN I CRY', 'Wanting to be loved despite flaws', 'Vulnerability', 'Perks of Being a Wallflower', 'Euphoria', 'Orange', 'Would you still stay if you saw everything?', 'Crying scenes, emotional breakdowns'),
  ('BLUE', 'Missing someone while wishing them well', 'Bittersweet Love', 'La La Land', 'HIMYM Finale', '5 Centimeters Per Second', 'I hope you''re happy. Even without me.', 'Watching someone leave'),
  ('ALWAYS ON MY MIND', 'Someone living inside your memories', 'Memory & Grief', 'Coco', 'This Is Us', 'Violet Evergarden', 'Some people never really leave.', 'Old photos, flashbacks'),
  ('TIENES UN AMIGO', 'Finding family far from home', 'Friendship', 'Stand By Me', 'Ted Lasso', 'One Piece', 'Sometimes home is another person.', 'Best friend scenes'),
  ('HOUSE PARTY', 'Feeling seen for the first time', 'Belonging', 'Perks of Being a Wallflower', 'Freaks and Geeks', 'My Dress Up Darling', 'Then somebody looked at me differently.', 'Outsider enters party'),
  ('MAKE BELIEVE', 'Choosing belief over reality', 'Dreamers', 'Walter Mitty', 'Adventure Time', 'Little Witch Academia', 'The impossible only exists until someone tries.', 'Flying, dreaming, adventures'),
  ('KID FOREVER', 'Refusing to become someone you''re not', 'Childhood Wonder', 'Peter Pan', 'Adventure Time', 'Pokémon', 'Growing older isn''t the same as growing up.', 'Playing, imagination scenes'),
  ('GAME BOY HEART', 'Escaping adulthood through fantasy', 'Childhood Wonder', 'Ready Player One', 'Pokémon', 'Digimon', 'Reality wasn''t enough.', 'Gaming scenes, adventures'),
  ('POKÉMON', 'Wonder and adventure', 'Adventure', 'Detective Pikachu', 'Pokémon', 'Pokémon', 'The world felt bigger back then.', 'Journey scenes'),
  ('WHAT''S MY AGE AGAIN', 'Rejecting adulthood', 'Rebellion', 'Superbad', 'Regular Show', 'FLCL', 'Nobody told me I had to stop having fun.', 'Chaos, pranks'),
  ('LETTING GO', 'Escaping expectations', 'Freedom', 'Into The Wild', 'Adventure Time', 'One Piece', 'The hardest thing to let go of was who I thought I was supposed to be.', 'Quitting jobs, running away'),
  ('AMERICAN DREAM', 'Rejecting society''s script', 'Freedom', 'Office Space', 'Severance', 'Zom 100', 'What if success isn''t what they told us?', 'Office scenes, resignations'),
  ('OCEAN GIRL', 'Letting go and trusting', 'Freedom & Love', 'The Notebook', 'Outer Banks', 'Ride Your Wave', 'If it''s meant for you, it''ll return.', 'Ocean, sunsets, departures'),
  ('PINK MOON', 'Someone giving you a reason to stay alive', 'Recovery', 'Silver Linings Playbook', 'BoJack Horseman', 'A Silent Voice', 'You didn''t save me. You gave me a reason to try.', 'Recovery scenes'),
  ('PARIS', 'Romanticizing destruction', 'Darkness', 'Trainspotting', 'Euphoria', 'Nana', 'Some memories are beautiful because they''re over.', 'Party scenes, self destruction'),
  ('CHEERLEADER', 'Wanting support from someone important', 'Family Conflict', 'Lady Bird', 'Gilmore Girls', 'Fruits Basket', 'The people we need most don''t always understand us.', 'Parent child arguments'),
  ('FEELING THIS', 'Brief intense connection', 'Passion', 'Before Sunrise', 'Skins', 'Nana', 'Some people change your life in a single night.', 'Fast romance scenes'),
  ('EMO GIRL', 'Reckless attraction', 'Chaos', 'Scott Pilgrim', 'Skins', 'FLCL', 'I knew it was a bad idea.', 'Wild romance'),
  ('HOLY', 'Seeing someone as sacred', 'Reverence', 'The Notebook', 'Heartstopper', 'Your Lie in April', 'Some people feel like religion.', 'Slow romantic moments'),
  ('I LIKE ME BETTER', 'Becoming better because of love', 'Growth', 'About Time', 'New Girl', 'Horimiya', 'You helped me become myself.', 'Personal growth montages'),
  ('SUGAR WE''RE GOING DOWN', 'Self destruction + obsession', 'Obsession', 'Donnie Darko', 'Skins', 'Death Note', 'I knew I''d regret it.', 'Chaotic relationship scenes'),
  ('YOU FEEL IT', 'Empathy for suffering', 'Compassion', 'Okja', 'Bluey', 'Wolf Children', 'If they could talk, what would they say?', 'Animal rescue scenes')
on conflict (song_title) do nothing;

-- Attach the legacy titles to the canonical catalog without creating songs.
update public.sync_ideas i
set song_id = s.id, updated_at = now()
from public.songs s
where i.song_id is null
  and regexp_replace(lower(i.song_title), '[^a-z0-9]', '', 'g') = regexp_replace(lower(s.title), '[^a-z0-9]', '', 'g');

-- Link legacy pitch records by their existing song title without changing
-- outreach history or replacing any established song_id relationships.
update public.outreach_records r
set song_id = s.id, updated_at = now()
from public.songs s
where r.song_id is null
  and coalesce(r.song_title, '') <> ''
  and regexp_replace(lower(r.song_title), '[^a-z0-9]', '', 'g') = regexp_replace(lower(s.title), '[^a-z0-9]', '', 'g');
