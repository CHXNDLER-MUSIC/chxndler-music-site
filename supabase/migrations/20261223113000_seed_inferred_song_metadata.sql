-- Fill blank catalog metadata with title-based estimates. Existing song data
-- and release dates are preserved. Estimates are explicitly recorded in
-- songs.metadata_provenance so the admin workspace can label them.
alter table public.songs
  add column if not exists metadata_provenance jsonb not null default '{}'::jsonb;

with release_slots as (
  select
    id,
    (coalesce((select max(release_date) from public.songs), date '2027-01-22')
      + ((row_number() over (order by title, id) * 14)::integer))::date as release_date
  from public.songs
  where is_released = false and release_date is null
), source_meanings as (
  select distinct on (regexp_replace(upper(song), '[^A-Z0-9]', '', 'g'))
    regexp_replace(upper(song), '[^A-Z0-9]', '', 'g') as song_key,
    nullif(trim(meaning_of_song), '') as meaning
  from public.song_outreach_status
  where nullif(trim(meaning_of_song), '') is not null
  order by regexp_replace(upper(song), '[^A-Z0-9]', '', 'g'), updated_at desc nulls last
), themes as (
  select
    song.id,
    song.title,
    song.slug,
    source_meanings.meaning as source_meaning,
    case
      when song.title ilike '%love%' or song.title ilike '%friend%' or song.title ilike '%heart%' or song.title ilike '%bee%' or song.title ilike '%always on my mind%' then 'Love & Relationships'
      when song.title ilike '%mom%' or song.title ilike '%famous%' or song.title ilike '%copycat%' or song.title ilike '%pretty%' or song.title ilike '%superstar%' or song.title ilike '%like this%' then 'Identity & Self-Image'
      when song.title ilike '%forever%' or song.title ilike '%game boy%' or song.title ilike '%pokemon%' or song.title ilike '%sugar%' or song.title ilike '%age again%' or song.title ilike '%playdough%' then 'Growing Up & Nostalgia'
      when song.title ilike '%home%' or song.title ilike '%ocean%' or song.title ilike '%paris%' or song.title ilike '%bermuda%' or song.title ilike '%tide%' or song.title ilike '%blue%' or song.title ilike '%pink moon%' then 'Belonging & Reflection'
      when song.title ilike '%party%' or song.title ilike '%vacation%' or song.title ilike '%chucks on%' or song.title ilike '%happy meal%' or song.title ilike '%cheerleader%' or song.title ilike '%holy%' then 'Joy & Escapism'
      when song.title ilike '%american dream%' or song.title ilike '%studio%' or song.title ilike '%space%' or song.title ilike '%heartverse%' or song.title ilike '%welcome%' then 'Dreams & Worldbuilding'
      else 'Change & Resilience'
    end as category
  from public.songs as song
  left join source_meanings on source_meanings.song_key = regexp_replace(upper(song.title), '[^A-Z0-9]', '', 'g')
), estimates as (
  select
    themes.*,
    release_slots.release_date as estimated_release_date,
    case
      when themes.source_meaning is not null then themes.source_meaning
      when themes.category = 'Love & Relationships' then 'Title-based estimate: “' || themes.title || '” explores the desire for closeness, the vulnerability of being known, and the uncertainty of what love asks from each person.'
      when themes.category = 'Identity & Self-Image' then 'Title-based estimate: “' || themes.title || '” reflects on self-worth, ambition, and the difference between the person someone is and the image others expect them to be.'
      when themes.category = 'Growing Up & Nostalgia' then 'Title-based estimate: “' || themes.title || '” holds onto play, memory, and youthful wonder while reckoning with the pressure to grow up.'
      when themes.category = 'Belonging & Reflection' then 'Title-based estimate: “' || themes.title || '” searches for a sense of home and emotional steadiness through distance, solitude, or change.'
      when themes.category = 'Joy & Escapism' then 'Title-based estimate: “' || themes.title || '” turns an everyday moment into a playful escape, using humor and energy to break from routine.'
      when themes.category = 'Dreams & Worldbuilding' then 'Title-based estimate: “' || themes.title || '” imagines a larger world to move toward, balancing hope, curiosity, and the need to find a place within it.'
      else 'Title-based estimate: “' || themes.title || '” follows a person moving through uncertainty and deciding what to keep, release, or become next.'
    end as meaning,
    case
      when themes.title ilike '%soundtrack%' then 'Video Game Soundtrack'
      when themes.title ilike '%remix%' then 'Electronic Pop'
      when themes.title ilike '%mr. brightside%' or themes.title ilike '%sugar,%' or themes.title ilike '%sugar we’re going down%' or themes.title ilike '%what%my age again%' or themes.title ilike '%feeling this%' then 'Pop Rock'
      when themes.title ilike '%acoustic%' then 'Pop'
      else 'Alternative Pop'
    end as genre,
    case
      when themes.title ilike '%soundtrack%' then 'Game Soundtrack'
      when themes.title ilike '%remix%' then 'Dance Pop'
      when themes.title ilike '%acoustic%' then 'Acoustic Pop'
      when themes.title ilike '%blue%' or themes.title ilike '%pink moon%' or themes.title ilike '%ocean%' or themes.title ilike '%tide in%' then 'Dream Pop'
      when themes.title ilike '%party%' or themes.title ilike '%cheerleader%' or themes.title ilike '%happy meal%' or themes.title ilike '%chucks on%' then 'Synth-Pop'
      when themes.title ilike '%mr. brightside%' or themes.title ilike '%sugar,%' or themes.title ilike '%what%my age again%' or themes.title ilike '%feeling this%' then 'Pop Punk'
      else 'Indie Pop'
    end as sub_genre,
    case
      when themes.title ilike '%soundtrack%' then 'Interactive Media Music'
      when themes.title ilike '%remix%' then 'Electropop'
      when themes.title ilike '%acoustic%' then 'Singer-Songwriter'
      when themes.title ilike '%mr. brightside%' or themes.title ilike '%sugar,%' or themes.title ilike '%what%my age again%' or themes.title ilike '%feeling this%' then 'Alternative Rock'
      when themes.title ilike '%blue%' or themes.title ilike '%pink moon%' or themes.title ilike '%ocean%' or themes.title ilike '%tide in%' then 'Atmospheric Pop'
      else 'Electropop'
    end as sub_genre_2,
    least(150, greatest(70,
      (case themes.category
        when 'Love & Relationships' then 102
        when 'Identity & Self-Image' then 110
        when 'Growing Up & Nostalgia' then 118
        when 'Belonging & Reflection' then 90
        when 'Joy & Escapism' then 124
        when 'Dreams & Worldbuilding' then 100
        else 96
      end)
      + case when themes.title ilike '%acoustic%' then -8 when themes.title ilike '%remix%' then 10 else 0 end
    )) as bpm
  from themes
  left join release_slots on release_slots.id = themes.id
)
update public.songs as song
set meaning = coalesce(nullif(trim(song.meaning), ''), estimates.meaning),
    category = coalesce(nullif(trim(song.category), ''), estimates.category),
    genre = coalesce(nullif(trim(song.genre), ''), estimates.genre),
    sub_genre = coalesce(nullif(trim(song.sub_genre), ''), estimates.sub_genre),
    sub_genre_2 = coalesce(nullif(trim(song.sub_genre_2), ''), estimates.sub_genre_2),
    bpm = coalesce(song.bpm, estimates.bpm),
    release_date = coalesce(song.release_date, estimates.estimated_release_date),
    metadata_provenance = song.metadata_provenance || jsonb_strip_nulls(jsonb_build_object(
      'meaning', case when nullif(trim(song.meaning), '') is null and estimates.source_meaning is null then 'inferred' end,
      'category', case when nullif(trim(song.category), '') is null then 'inferred' end,
      'genre', case when nullif(trim(song.genre), '') is null then 'inferred' end,
      'sub_genre', case when nullif(trim(song.sub_genre), '') is null then 'inferred' end,
      'sub_genre_2', case when nullif(trim(song.sub_genre_2), '') is null then 'inferred' end,
      'bpm', case when song.bpm is null then 'inferred' end,
      'release_date', case when song.release_date is null and estimates.estimated_release_date is not null then 'inferred' end
    ))
from estimates
where song.id = estimates.id;
