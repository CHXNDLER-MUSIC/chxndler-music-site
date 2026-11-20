alter table public.gig_outreach
  add column if not exists video_created boolean not null default false;
