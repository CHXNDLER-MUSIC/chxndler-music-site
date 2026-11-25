alter table public.collaboration_requests
  drop constraint if exists collaboration_requests_status_check;

alter table public.collaboration_requests
  add constraint collaboration_requests_status_check
  check (status in ('new','reviewing','approved','declined','returned','agreement_pending','signed','in_progress','completed','canceled','archived'));
