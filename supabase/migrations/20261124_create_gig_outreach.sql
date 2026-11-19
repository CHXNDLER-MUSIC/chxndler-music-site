create table if not exists public.gig_outreach (
  id uuid primary key default gen_random_uuid(),
  venue text not null,
  neighborhood text not null default '',
  address text not null default '',
  city text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  website text not null default '',
  contact_email text not null default '',
  phone text not null default '',
  capacity text not null default '',
  subject text not null default '',
  email_copy text not null default '',
  form_url text not null default '',
  date_sent date,
  notes text not null default '',
  performed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gig_outreach_venue_idx on public.gig_outreach (venue);
alter table public.gig_outreach enable row level security;
revoke all on public.gig_outreach from anon, authenticated;
grant all on public.gig_outreach to service_role;

insert into public.gig_outreach
  (venue, neighborhood, address, city, first_name, last_name, website, contact_email, phone, capacity, subject, email_copy, form_url, date_sent, notes, performed)
values
  ('Brooklyn Music Kitchen', '', '177 Vanderbilt Ave, Brooklyn, NY 11205', 'NY', '', '', 'https://brooklynmusickitchen.com/', '', '', '', '', '', '', null, 'Weekly open mic/music night on Wednesdays (7:30 PM) with instruments and in-house band available.', true),
  ('SoHo Playhouse', '', '', '', '', '', '', '', '', '', '', '', '', null, '', true),
  ('Arlenes Grocery', 'Lower East Side', '95 Stanton Street, New York, NY 10002', 'NY', 'Dan', 'Murray', 'https://www.arlenesgrocerynyc.com', 'danarlenesgrocery@gmail.com', '', '', '', '', '', '2026-07-22', 'Jason from Recess gave me contact info', false),
  ('Baby’s All Right', 'Williamsburg', '146 Broadway, Brooklyn, NY 11211', 'NY', 'N/A', 'N/A', 'http://babysallright.com', 'babysallright@gmail.com', '718-599-5800', '~280', '', 'Bar / Music Venue', '', '2026-07-22', '', false),
  ('Pete’s Candy Store', 'Williamsburg', '709 Lorimer St, Brooklyn, NY 11211', 'NY', 'N/A', 'N/A', 'http://www.petescandystore.com', 'booking@petescandystore.com', '718-302-3770', '~50', '', 'Bar / Live Music', '', '2026-07-22', 'Submitted on online form', false),
  ('TV EYE', 'Ridgewood', '1647 Weirfield St, Ridgewood, NY 11385', 'NY', 'N/A', 'N/A', 'https://tveyenyc.com', 'info@tveyenyc.com', '', '', '', 'Bar / Live Music', '', '2026-07-22', 'Submitted on online form and emailed', false),
  ('Pianos', '', '', 'NY', '', '', '', '', '', '', '', '', '', null, '', false),
  ('The Sultan Room', '', '', 'NY', '', '', '', '', '', '', '', '', '', null, '', false),
  ('Baker Falls', '', '', '', '', '', '', '', '', '', '', '', '', null, '', false),
  ('Bowery Electric', '', '', '', '', '', '', '', '', '', '', '', '', null, '', false),
  ('Mercury Lounge', '', '', 'NY', '', '', '', '', '', '', '', '', '', null, '', false),
  ('Elsewhere', '', '', 'NY', '', '', '', '', '', '', '', '', '', null, '', false),
  ('The Owl Music Parlor', 'Prospect Lefferts Gardens', '497 Rogers Ave, Brooklyn, NY 11225', 'NY', '', '', 'http://theowl.nyc', 'info@theowl.nyc', '', '~40', 'Very intimate, experimental-friendly', 'Listening Room', '', null, '', false),
  ('Barbès', 'Park Slope', '376 9th St, Brooklyn, NY 11215', 'NY', '', '', 'http://www.barbesbrooklyn.com', 'booking@barbesbrooklyn.com', '347-422-0248', '~60', 'Eclectic programming', 'Bar / Performance Space', '', null, '', false),
  ('Williamsburg Music Center', 'Williamsburg', '367 Bedford Ave, Brooklyn, NY 11211', 'NY', '', '', 'https://wmcjazz.com', 'info@wmcjazz.com', '718-384-1654', '~50', 'Community-focused', 'Jazz Club', '', null, '', false),
  ('Music Hall of Williamsburg', 'Williamsburg', '66 N 6th St, Brooklyn, NY 11211', 'NY', '', '', 'http://musichallofwilliamsburg.com', 'info@musichallofwilliamsburg.com', '718-486-5400', '~550', 'Aim for opener slots', 'Concert Venue', '', null, '', false),
  ('Warsaw', 'Greenpoint', '261 Driggs Ave, Brooklyn, NY 11222', 'NY', '', '', 'https://www.warsawconcerts.com', 'booking@warsawconcerts.com', '929-441-3114', '~1,000', 'Larger room, touring acts', 'Concert Hall', '', null, '', false),
  ('The Bell House', 'Gowanus', '149 7th St, Brooklyn, NY 11215', 'NY', '', '', 'http://www.thebellhouseny.com', 'booking@thebellhouseny.com', '', '~750', 'Curated bookings', 'Music / Comedy Venue', '', null, '', false),
  ('National Sawdust', 'Williamsburg', '80 N 6th St, Brooklyn, NY 11249', 'NY', '', '', 'http://nationalsawdust.org', 'info@nationalsawdust.org', '646-779-8455', '~150', 'Experimental / high-art', 'Performance Art Space', '', null, '', false),
  ('Brooklyn Steel', 'East Williamsburg', '319 Frost St, Brooklyn, NY 11222', 'NY', '', '', 'https://www.bowerypresents.com', 'info@bowerypresents.com', '888-929-7849', '~1,800', 'Hard for new artists', 'Concert Venue', '', null, '', false)
on conflict (venue) do nothing;
