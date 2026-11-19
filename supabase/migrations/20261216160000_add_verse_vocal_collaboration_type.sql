alter table public.collaboration_requests
  drop constraint if exists collaboration_requests_contribution_type_check;

alter table public.collaboration_requests
  add constraint collaboration_requests_contribution_type_check
  check (contribution_type in (
    'Vocals / Feature',
    'Production / Remix',
    'Songwriting',
    'Other',
    'Music Video',
    'Sing / Rap on Verse'
  ));
