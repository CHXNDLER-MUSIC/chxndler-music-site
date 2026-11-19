-- Connect the imported content library to canonical songs without changing
-- or removing any imported content fields or records.
alter table public.content_items
  add column if not exists song_id uuid references public.songs(id) on delete set null;

create index if not exists content_items_song_id_idx
  on public.content_items (song_id, source_row);

-- Link only exact, unique title matches. Unmatched and ambiguous song names
-- remain untouched and are reported by the admin API.
with unique_song_matches as (
  select ci.id, min(s.id::text)::uuid as song_id
  from public.content_items ci
  join public.songs s
    on lower(trim(s.title)) = lower(trim(ci.song_name))
  where ci.song_id is null
    and nullif(trim(ci.song_name), '') is not null
    and upper(trim(ci.song_name)) <> 'N/A'
  group by ci.id
  having count(*) = 1
)
update public.content_items ci
set song_id = matches.song_id,
    updated_at = now()
from unique_song_matches matches
where ci.id = matches.id;

create or replace view public.content_items_library as
select
  ci.*,
  s.title as canonical_song_title,
  case
    when ci.song_id is not null then 'matched'
    when nullif(trim(ci.song_name), '') is null or upper(trim(ci.song_name)) = 'N/A' then 'unlinked'
    when exists (
      select 1 from public.songs candidate
      where lower(trim(candidate.title)) = lower(trim(ci.song_name))
      group by lower(trim(candidate.title))
      having count(*) > 1
    ) then 'ambiguous'
    else 'unmatched'
  end as song_link_status,
  case
    when ci.published is true then 'Posted'
    when ci.post_ready is true
      and ci.planned_date > current_date
      and ci.is_placeholder_date is false then 'Scheduled'
    when ci.post_ready is true
      or (ci.recorded is true and ci.edited is true) then 'Ready'
    when ci.recorded is true and ci.edited is not true then 'To Edit'
    when ci.recorded is not true
      and ci.edited is not true
      and ci.post_ready is not true
      and ci.published is not true
      and nullif(trim(ci.script), '') is null
      and nullif(trim(ci.media_url), '') is null
      and nullif(trim(ci.source_url), '') is null
      and nullif(trim(ci.caption), '') is null
      and nullif(trim(ci.text_on_screen), '') is null then 'Idea'
    else 'To Record'
  end as workflow_status
from public.content_items ci
left join public.songs s on s.id = ci.song_id;

revoke all on public.content_items_library from public, anon, authenticated;
grant select on public.content_items_library to service_role;
