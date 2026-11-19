-- A collaborator may be invited to multiple songs. The bearer token identifies
-- one invitation and song; display names are descriptive, not unique keys.
drop index if exists public.collaboration_invites_normalized_name_idx;
