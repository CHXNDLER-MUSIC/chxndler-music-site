-- Collaboration requests retain the guidelines version shown in the form,
-- but submitting a request does not record legal acceptance of those terms.
alter table public.collaboration_requests
  alter column acknowledged_at drop not null;
