create table if not exists public.outreach_records (
  id uuid primary key default gen_random_uuid(),
  category text,
  platform text,
  playlist_name text,
  playlist_genre text,
  link text,
  linkedin_url text,
  notes text,
  first_name text,
  last_name text,
  email text,
  song text,
  genre text,
  youtube_video text,
  spotify text,
  email_subject text,
  email_opening_line text,
  email_body text,
  pitch_1 text,
  pitch_2 text,
  pitch_date date,
  ready boolean not null default false,
  contact_name text,
  company_music_supervisor text,
  project_type text,
  contact_email text,
  pitch_status text,
  song_title text,
  song_link text,
  instrumental_link text,
  vibe_themes text,
  one_liner text,
  licensing_info text,
  pitch text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_records_category_idx on public.outreach_records (category);
create index if not exists outreach_records_platform_idx on public.outreach_records (platform);
create index if not exists outreach_records_playlist_name_idx on public.outreach_records (playlist_name);
create index if not exists outreach_records_company_idx on public.outreach_records (company_music_supervisor);
create index if not exists outreach_records_email_idx on public.outreach_records (lower(coalesce(email, contact_email)));

alter table public.outreach_records enable row level security;
revoke all on public.outreach_records from anon, authenticated;
grant all on public.outreach_records to service_role;

insert into public.outreach_records (category, platform, playlist_name, link, linkedin_url, notes, first_name, email)
values
  ('PLAYLIST','Spotify','Head of Dance & EDM Dev',null,'https://www.linkedin.com/in/ronny-ho','', 'Ronny','ronny@spotify.com'),
  ('PLAYLIST','Spotify','Dance & Electronic Editor',null,'https://www.linkedin.com/in/caleb-trouwborst-24853a66','', 'Caleb','calebt@spotify.com'),
  ('PLAYLIST','Apple','Dance Music Editor',null,'https://www.linkedin.com/in/robbyengle/','', 'Robby','rengle@apple.com'),
  ('PLAYLIST','Apple','Marketing Lead, Latin/Dance Music and Culture at Apple Music',null,'https://www.linkedin.com/in/andreaportela','', 'Andrea','aportela@apple.com'),
  ('PLAYLIST','Deezer','Global Dance Editor',null,'https://www.linkedin.com/in/laetitia-berry-780837111/','', 'Laetitia','lberry@deezer.com'),
  ('PLAYLIST','Audiomack','Sr. Marketing Manager - Europe & Electronic at Audiomack',null,'https://www.linkedin.com/in/felix-de-jong-b8b568110/','', 'Felix','felix@audiomack.com'),
  ('PLAYLIST','Audiomack','CMO',null,'https://www.linkedin.com/in/davidponte/','', 'Ponte','ponte@audiomack.com'),
  ('PLAYLIST','Audius','Community Lead',null,'https://www.linkedin.com/in/michaelculleniii/','', 'Michael','michael.cullen@audius.co'),
  ('PLAYLIST','Audius','Social Media',null,'https://www.linkedin.com/in/ciara-graves/','', 'Ciara','ciara@audius.co'),
  ('PLAYLIST','Anghami','Head of Curation',null,'https://www.linkedin.com/in/fadyferraye/','', 'Fady','fady@anghami.com'),
  ('PLAYLIST','Anghami','Music Curator',null,'https://www.linkedin.com/in/peter-khalil-7814761a1/','inv: pkhalil@anghami.com, peter@anghami.com', 'Peter','peter.khalil@anghami.com'),
  ('PLAYLIST','Tidal','Senior Manager, Pop & Latin Music',null,'https://www.linkedin.com/in/amberliz-mateo-108003ba/','inv: amberliz.mateo@tidal.com', 'Amberliz','amateo@tidal.com'),
  ('PLAYLIST','Tidal','Head of Programming',null,'https://www.linkedin.com/in/joedodd/','', 'Joe','joe.dodd@tidal.com'),
  ('PLAYLIST','Amazon','Senior Music Curator, Dance & Electronic',null,'https://www.linkedin.com/in/willmcgillivray/','inv: willm@amazon.com','Will','willmcgillivray@amazon.com, will.mcgillivray@amazon.com, wmcgillivray@amazon.com, mcgillivray@amazon.com, mcgillivrayw@amazon.com'),
  ('PLAYLIST','Amazon','Head of Dance in US',null,'https://www.linkedin.com/in/ben-gill-20557996','', 'Ben','partyben@amazon.com'),
  ('PLAYLIST','Pandora','Director of Content & Curation',null,'https://www.linkedin.com/in/djbenharvey/','', 'Ben','ben.Harvey@siriusxm.com'),
  ('PLAYLIST','SiriusXM','Music Programming',null,'https://www.linkedin.com/in/michael-tam-b79128b2/','', 'Michael','michael.tam@siriusxm.com'),
  ('PLAYLIST','YouTube','Dance Curator',null,null,'', 'Austin','austinkramer@google.com');
