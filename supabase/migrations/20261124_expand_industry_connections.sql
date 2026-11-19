alter table public.marketing_contacts
  add column if not exists venue text,
  add column if not exists industry_category text not null default 'Other',
  add column if not exists relationship text,
  add column if not exists referred_by text,
  add column if not exists connection_status text not null default 'not_contacted'
    check (connection_status in ('not_contacted','connected','follow_up','active','do_not_contact')),
  add column if not exists last_contacted_at timestamptz,
  add column if not exists follow_up_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists marketing_contacts_category_idx on public.marketing_contacts (industry_category);
create index if not exists marketing_contacts_status_idx on public.marketing_contacts (connection_status);
create index if not exists marketing_contacts_follow_up_idx on public.marketing_contacts (follow_up_at) where follow_up_at is not null;

-- Retain the source notes and avoid adding the same person again if the import
-- is re-run or the contact has already been entered by email or phone.
with contacts(first_name,last_name,email,phone,venue,note,industry_category,relationship,referred_by,connection_status) as (values
  ('Jon',null,'Jon@unionstage.com','2404473464','Union Stage | Capital Turnaround | Jammin Java | Miracle Theatre | The Howard','Max (curley hair) from Pie Shop gave me number','Venue / Booking','Venue contact','Max (curley hair) from Pie Shop','connected'),
  ('Zeeshan','Shad','zeeshan@pieshopdc.com',null,'Pie Shop','Books Pie shop','Venue / Booking','Booker','', 'not_contacted'),
  ('Chris (from NY)',null,null,null,null,'Friend of DChav, DJ','Artist / Peer','Friend and DJ','DChav','connected'),
  ('Patrick (charity gala)',null,null,null,null,'Met through charity gala.','Industry Connection','Event contact','Charity gala','connected'),
  ('Patrick','Elmore',null,null,null,'','Industry Connection','','','not_contacted'),
  ('Ricky','Lasser',null,'443-878-6399',null,'Cousin, works with podcast/film','Film / Media','Family connection; podcast and film','Family','connected'),
  ('Mike','Demarco','Mikedemarcodrums@me.com','443-768-8258',null,'Old drummer in Worth Our While. Music producer','Producer / Musician','Former bandmate; drummer and producer','Worth Our While','connected'),
  ('Daniel','Citron',null,null,null,'','Industry Connection','','','not_contacted'),
  ('Mike','Tucci','MasteredbyMikeTucci@gmail.com','347-885-8421',null,'Mastered We’re Just Friends. Referred by Dan Book','Recording / Mastering','Mastering engineer','Dan Book','connected'),
  ('Jonathan','Aronoff',null,'973-865-3224',null,'Old camp counselor. Works as producer on TV. Offered to have me on TV show once I get things moving.','TV / Film','TV producer; offered a TV show opportunity','Camp connection','connected'),
  ('Heidi','Klotzman','Heidi.Klotzman@gmail.com','443-676-7846','HeidnSeekEnt','Connected on LinkedIn. From Baltimore. Spoke on phone. Connected me with MightyMark.','Management / Entertainment','Entertainment contact; spoke by phone','LinkedIn; connected me with Mighty Mark','connected'),
  ('Jill','Kaplan','Jill.kaplan@sonymusic.com','201-320-8811','Sony Music','Cousin of Jen Goldstein. Music video director for Sony Music. Spoke on the phone and gave great advice.','Music Video / Label','Music video director; spoke by phone','Jen Goldstein','connected'),
  ('Kyle','McEvoy',null,'203-525-4633',null,'Friend of Louis Bookoff. Created successful music label','Label / Music Business','Created a successful music label','Louis Bookoff','connected'),
  ('Mighty Mark','(Producer)','marquis@newmusicusa.org','443-630-1167','New Music USA','Heidi Klotzman connected us. Heidi has worked with Mark and suggested he could be helpful for sync licensing.','Sync / Producer','Producer; potential sync licensing connection','Heidi Klotzman','connected'),
  ('Brandon','Walker',null,'410-440-0772',null,'Old music teacher/soccer coach. Musician','Musician / Mentor','Former teacher and soccer coach; musician','', 'connected'),
  ('Paul','Bacher','paulmbacher@gmail.com','(203) 644-3801','Madison Square Garden','Connected by Izzi Negrin. Booker of Madison Square Garden','Venue / Booking','Booker','Izzi Negrin','connected'),
  ('Akash',null,null,'(240) 253-3384',null,'Old roommate of Jerm. Produced Sunday Morning Brunch','Producer','Producer of Sunday Morning Brunch','Jerm','connected'),
  ('Kevin','Shook',null,'(443) 737-7661',null,'Local DMV Booking Agent. Name given by Ralph Rillon','Venue / Booking','Local DMV booking agent','Ralph Rillon','not_contacted'),
  ('Andore',null,'umamimultimedia@gmail.com',null,'Umami Multimedia','Cami’s boyfriend; multimedia contact. Brother is Pedro.','Production / Multimedia','Multimedia connection','Cami','not_contacted'),
  ('Pedro',null,'bbmusicproducer@gmail.com',null,null,'Brother of Andore; music producer.','Producer / Musician','Producer; brother of Andore','Andore','not_contacted'),
  ('Jared',null,null,null,null,'','Industry Connection','','','not_contacted'),
  ('Juan Alejandro','Martinez',null,null,'Sukhanyc','Met at coffee shop in Greenpoint; runs Electronic Collective @Sukhanyc','Artist / Collective','Runs Electronic Collective @Sukhanyc','Met at coffee shop in Greenpoint','connected')
)
insert into public.marketing_contacts (first_name,last_name,email,phone,venue,note,industry_category,relationship,referred_by,connection_status)
select c.first_name,c.last_name,c.email,c.phone,c.venue,c.note,c.industry_category,c.relationship,nullif(c.referred_by,''),c.connection_status
from contacts c
where not exists (
  select 1 from public.marketing_contacts m
  where (c.email is not null and lower(trim(m.email)) = lower(trim(c.email)))
     or (c.phone is not null and regexp_replace(m.phone, '\D', '', 'g') = regexp_replace(c.phone, '\D', '', 'g'))
     or (c.email is null and c.phone is null and lower(trim(coalesce(m.first_name,'') || ' ' || coalesce(m.last_name,''))) = lower(trim(c.first_name || ' ' || coalesce(c.last_name,''))))
);
