alter table public.collaboration_requests
  add column if not exists recording_arrangement text
  check (recording_arrangement is null or recording_arrangement in ('chxndler_session', 'independent', 'other'));
