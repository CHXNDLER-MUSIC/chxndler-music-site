-- Sample bonus quests data for the Heartverse Heart Coins system

-- Insert core bonus quests (always show)
INSERT INTO bonus_quests (
  quest_key, title, description, category, is_active, is_core, sort_order,
  max_times_per_day, max_total_completions, reward_heartcoins, reward_element_card, reward_notes
) VALUES 
  -- Core quest: Invite Friend
  (
    'INVITE_FRIEND',
    'Invite a Friend',
    'Share the Heartverse with someone you love. When they join, you both earn HEART coins.',
    'COMMUNITY',
    true,
    true,
    100, -- Higher sort_order to appear after featured quests
    1,
    null, -- No total limit, can invite multiple friends
    3,
    false,
    '+3 (1 max per day)'
  ),
  
  -- Core quest: Attend Livestream
  (
    'ATTEND_LIVESTREAM',
    'Attend a Livestream or Live Show',
    'Check in at a CHXNDLER show to receive bonus HEART coins.',
    'COMMUNITY',
    true,
    true,
    101, -- Higher sort_order to appear after featured quests
    1,
    null, -- No total limit, can attend multiple shows
    5,
    false,
    '+1-5 (1 max per day)'
  ),

-- Insert rotating featured quests (non-core)
  -- One-time quest: Listen to Elemental Song
  (
    'LISTEN_ELEMENT_SONG',
    'Listen to Your Elemental Song',
    'Play the song that matches your elemental affinity in the Heartverse.',
    'LISTENING',
    true,
    false,
    1, -- Low sort_order to appear first in rotation
    1,
    1, -- One time ever per user
    2,
    true,
    '+2 + Element Card'
  ),
  
  -- One-time quest: Listen to Featured Song  
  (
    'LISTEN_FEATURED_SONG',
    'Listen to the Featured Song',
    'Discover and play the currently featured track in the Heartverse.',
    'LISTENING',
    true,
    false,
    2,
    1,
    1, -- One time ever per user
    2,
    false,
    '+2 (one time only)'
  ),

-- Social media follow quests (one-time each)
  (
    'FOLLOW_SPOTIFY',
    'Follow CHXNDLER on Spotify',
    'Stay connected with the latest releases and playlists.',
    'SUPPORT',
    true,
    false,
    10,
    1,
    1, -- One time ever per user
    3,
    false,
    '+3 (one time only)'
  ),
  
  (
    'FOLLOW_TIKTOK',
    'Follow CHXNDLER on TikTok',
    'Join the community for behind-the-scenes content and updates.',
    'SUPPORT',
    true,
    false,
    11,
    1,
    1, -- One time ever per user
    3,
    false,
    '+3 (one time only)'
  ),
  
  (
    'FOLLOW_INSTAGRAM',
    'Follow CHXNDLER on Instagram',
    'Get exclusive photos and stories from the Heartverse journey.',
    'SUPPORT',
    true,
    false,
    12,
    1,
    1, -- One time ever per user
    3,
    false,
    '+3 (one time only)'
  ),
  
  (
    'FOLLOW_YOUTUBE',
    'Subscribe on YouTube',
    'Never miss a music video, live performance, or behind-the-scenes content.',
    'SUPPORT',
    true,
    false,
    13,
    1,
    1, -- One time ever per user
    3,
    false,
    '+3 (one time only)'
  );

-- Note: The system will show:
-- 1. One rotating featured quest (first available non-core quest)
-- 2. Two core quests (INVITE_FRIEND and ATTEND_LIVESTREAM)
--
-- As users complete one-time quests like LISTEN_ELEMENT_SONG, they disappear 
-- for that user and the next available quest in rotation takes its place.
--
-- Example progression for a user:
-- Initial: [LISTEN_ELEMENT_SONG, INVITE_FRIEND, ATTEND_LIVESTREAM]
-- After completing elemental song: [LISTEN_FEATURED_SONG, INVITE_FRIEND, ATTEND_LIVESTREAM]  
-- After completing featured song: [FOLLOW_SPOTIFY, INVITE_FRIEND, ATTEND_LIVESTREAM]
-- And so on...