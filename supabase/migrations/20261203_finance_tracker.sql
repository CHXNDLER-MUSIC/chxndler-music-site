create table if not exists public.finance_records (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('Software','Merch','Advertising')),
  record_type text not null default 'expense' check (record_type in ('subscription','merch_item','campaign','expense')),
  name text not null check (length(trim(name)) between 1 and 180),
  vendor text not null default '',
  amount numeric(12,2),
  amount_kind text not null default 'estimate' check (amount_kind in ('recurring_rate','estimate','budget')),
  frequency text check (frequency in ('monthly','annual','one_time')),
  quantity integer check (quantity is null or quantity >= 0),
  status text not null default 'planned' check (status in ('active','needs_review','planned','cancelled','ordered','received','running','completed')),
  payment_status text not null default 'unknown' check (payment_status in ('unknown','unpaid','paid')),
  actual_amount numeric(12,2),
  paid_on date,
  renewal_date date,
  campaign_start date,
  campaign_end date,
  related_song_id uuid references public.songs(id) on delete set null,
  website text not null default '',
  purchase_url text not null default '',
  thumbnail_url text not null default '',
  description text not null default '',
  notes text not null default '',
  legacy_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_nonnegative_amounts check (
    (amount is null or amount >= 0) and (actual_amount is null or actual_amount >= 0)
  ),
  constraint finance_paid_requires_actual check (
    payment_status <> 'paid' or (actual_amount is not null and paid_on is not null)
  )
);

create index if not exists finance_records_category_status_idx
  on public.finance_records(category, status, name);
create index if not exists finance_records_paid_on_idx
  on public.finance_records(paid_on desc) where payment_status = 'paid';
alter table public.finance_records enable row level security;
revoke all on public.finance_records from anon, authenticated;
grant all on public.finance_records to service_role;

-- Preserve the original static Finance page exactly once. Amounts are listed
-- as estimates or recurring rates; payment history and lifecycle state were
-- not present, so neither is fabricated.
insert into public.finance_records
  (category,record_type,name,vendor,amount,amount_kind,frequency,quantity,status,payment_status,website,description,legacy_key)
values
  ('Software','subscription','Domain name','Go Daddy',47,'recurring_rate','annual',null,'needs_review','unknown','https://chxndler-music.com','.COM Domain Registration (11.99), full domain protection (9.99)','legacy:software:godaddy:domain'),
  ('Software','subscription','Email','Go Daddy',24,'recurring_rate','annual',null,'needs_review','unknown','mailto:info@chxndler-music.com','Microsoft 365 Email Essentials From GoDaddy','legacy:software:godaddy:email'),
  ('Software','subscription','File Management','Google',25,'recurring_rate','monthly',null,'needs_review','unknown','https://drive.google.com/drive/u/0/','','legacy:software:google:file-management'),
  ('Software','subscription','Artist profile','Distrokid',36,'recurring_rate','annual',null,'needs_review','unknown','https://distrokid.com','Musician Plus','legacy:software:distrokid:artist-profile'),
  ('Software','subscription','Video Editor','CapCut',11,'recurring_rate','monthly',null,'needs_review','unknown','','','legacy:software:capcut:video-editor'),
  ('Software','subscription','Email Template','Mailchimp',0,'recurring_rate',null,null,'needs_review','unknown','https://mailchimp.com','Dropbox Plus (2,000 GB storage)','legacy:software:mailchimp:email-template'),
  ('Merch','merch_item','CHXNDLER CARDS','Staples',153,'estimate','one_time',100,'planned','unknown','https://www.staples.com','# of sheets','legacy:merch:staples:cards'),
  ('Merch','merch_item','PIN','Sticker Mule',31,'estimate','one_time',50,'planned','unknown','https://www.stickermule.com','','legacy:merch:stickermule:pin'),
  ('Merch','merch_item','Beanie','Connectyle',9,'estimate','one_time',20,'planned','unknown','https://www.amazon.com/dp/B07YSTXVMV?ref_=ppx_hzsearch_conn_dt_b_fed_asin_title_1&th=1&psc=1','','legacy:merch:connectyle:beanie'),
  ('Merch','merch_item','PATCH','customembroiderydigi',69,'estimate','one_time',30,'planned','unknown','https://www.etsy.com/listing/1376588618/custom-embroidered-patches-your-own','','legacy:merch:customembroiderydigi:patch'),
  ('Merch','merch_item','Sticker','Sticker Mule',31,'estimate','one_time',50,'planned','unknown','https://www.stickermule.com','','legacy:merch:stickermule:sticker'),
  ('Merch','merch_item','Hat','',null,'estimate','one_time',null,'planned','unknown','','','legacy:merch:hat'),
  ('Merch','merch_item','Keychain','Sticker Mule',23,'estimate','one_time',10,'planned','unknown','https://www.stickermule.com','','legacy:merch:stickermule:keychain'),
  ('Merch','merch_item','House Party Poster','Sticker Mule',27,'estimate','one_time',1,'planned','unknown','https://www.stickermule.com','18" x 24"','legacy:merch:stickermule:house-party-poster'),
  ('Merch','merch_item','Necklace (Chain)','Ball Chain',46,'estimate','one_time',100,'planned','unknown','https://www.ballchain.com','','legacy:merch:ball-chain:necklace'),
  ('Merch','merch_item','Necklace (Charm)','Sticker Mule',56,'estimate','one_time',50,'planned','unknown','https://www.stickermule.com','','legacy:merch:stickermule:necklace-charm'),
  ('Merch','merch_item','Button','Sticker Mule',20,'estimate','one_time',50,'planned','unknown','https://www.stickermule.com','1.25"','legacy:merch:stickermule:button'),
  ('Merch','merch_item','Bracelet','',null,'estimate','one_time',null,'planned','unknown','','','legacy:merch:bracelet'),
  ('Merch','merch_item','Pick','Wilmington Fibre Specialty Company',57,'estimate','one_time',100,'planned','unknown','','','legacy:merch:wilmington-fibre:pick'),
  ('Advertising','campaign','Facebook/Instagram Ads','Meta',null,'budget',null,null,'planned','unknown','','','legacy:advertising:meta'),
  ('Advertising','campaign','TikTok Ads','TikTok',null,'budget',null,null,'planned','unknown','','','legacy:advertising:tiktok')
on conflict (legacy_key) do nothing;
