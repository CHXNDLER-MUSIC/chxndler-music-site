alter table public.collaboration_invites
  add column if not exists display_name text,
  add column if not exists normalized_display_name text,
  add column if not exists last_accessed_at timestamptz;

update public.collaboration_invites i
set display_name = coalesce(s.title, 'Creative') || ' (legacy ' || left(i.id::text, 8) || ')'
from public.songs s
where i.song_id = s.id and i.display_name is null;

update public.collaboration_invites
set display_name = 'Creative (legacy ' || left(id::text, 8) || ')'
where display_name is null;

update public.collaboration_invites
set normalized_display_name = lower(regexp_replace(trim(display_name), '\s+', ' ', 'g'))
where normalized_display_name is null;

-- Legacy links were song-specific and are replaced by personal, gallery-wide invites.
update public.collaboration_invites
set revoked_at = now()
where song_id is not null and revoked_at is null;

alter table public.collaboration_invites alter column display_name set not null;
alter table public.collaboration_invites alter column display_name set default 'Creative';
alter table public.collaboration_invites alter column song_id drop not null;

create unique index if not exists collaboration_invites_normalized_name_idx
  on public.collaboration_invites (normalized_display_name);
create index if not exists collaboration_invites_status_access_idx
  on public.collaboration_invites (revoked_at, expires_at, last_accessed_at desc);

alter table public.collaboration_requests
  add column if not exists invite_id uuid references public.collaboration_invites(id) on delete set null;
create index if not exists collaboration_requests_invite_id_idx
  on public.collaboration_requests (invite_id, submitted_at desc);

-- Invitation tokens remain hashes only. Sessions are signed, short-lived cookies;
-- every request checks this row again so revocation takes effect immediately.
