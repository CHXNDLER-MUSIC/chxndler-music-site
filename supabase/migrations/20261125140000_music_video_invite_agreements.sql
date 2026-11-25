alter table public.music_video_invites
  add column if not exists recipient_name text not null default '',
  add column if not exists expires_at timestamptz,
  add column if not exists agreement_terms jsonb not null default '{}'::jsonb,
  add column if not exists agreement_status text not null default 'pending',
  add column if not exists agreement_signer_name text,
  add column if not exists agreement_signed_at timestamptz,
  add column if not exists agreement_acceptance_text text;

alter table public.music_video_invites
  drop constraint if exists music_video_invites_agreement_status_check;
alter table public.music_video_invites
  add constraint music_video_invites_agreement_status_check
  check (agreement_status in ('pending', 'signed'));
