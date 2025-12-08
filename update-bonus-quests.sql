-- Update bonus quest reward notes and description to match UI requirements
UPDATE bonus_quests 
SET reward_notes = '+1 /day',
    description = 'Share the Heartverse with someone you love.\nWhen they join, you both earn HEART coins.'
WHERE quest_key = 'INVITE_FRIEND';

UPDATE bonus_quests 
SET reward_notes = '+1-5' 
WHERE quest_key = 'ATTEND_LIVESTREAM';

-- Verify the updates
SELECT quest_key, title, reward_notes FROM bonus_quests 
WHERE quest_key IN ('INVITE_FRIEND', 'ATTEND_LIVESTREAM');