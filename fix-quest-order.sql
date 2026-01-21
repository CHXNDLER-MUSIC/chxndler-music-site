-- Fix bonus quest ordering:
-- #1: Rotating featured quest (sort_order 1-13)  
-- #2: Invite a Friend (sort_order 50)
-- #3: Attend a Livestream or Live Show (sort_order 51)

-- First, remove any existing ATTEND_LIVESTREAM quest to avoid conflicts
DELETE FROM bonus_quests WHERE quest_key = 'ATTEND_LIVESTREAM';

-- Update "Invite a Friend" to appear as the first core quest (second overall)
UPDATE bonus_quests 
SET sort_order = 50, is_core = true
WHERE quest_key = 'INVITE_FRIEND';

-- Update the Daily Check-In quest to become "Attend a Livestream or Live Show"
UPDATE bonus_quests 
SET 
    quest_key = 'ATTEND_LIVESTREAM',
    title = 'Attend a Livestream or Live Show',
    description = 'Check in at a CHXNDLER show to receive bonus HeartCoins.',
    category = 'COMMUNITY',
    sort_order = 51,
    is_core = true,
    reward_heartcoins = 5,
    reward_notes = '+1-5'
WHERE quest_key = 'DAILY_CHECKIN' OR quest_key = 'DAILY_CHECK_IN' OR title ILIKE '%daily%check%';

-- Make sure any other interfering quests have higher sort orders
UPDATE bonus_quests 
SET sort_order = 200
WHERE quest_key NOT IN ('INVITE_FRIEND', 'ATTEND_LIVESTREAM') AND is_core = true;

-- Verify the new ordering
SELECT quest_key, title, sort_order, is_core 
FROM bonus_quests 
WHERE is_active = true
ORDER BY sort_order ASC;
