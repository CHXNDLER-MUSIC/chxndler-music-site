-- Update bonus quest reward notes to match UI requirements
UPDATE bonus_quests 
SET reward_notes = '+1 /day' 
WHERE quest_key = 'INVITE_FRIEND';

UPDATE bonus_quests 
SET reward_notes = '+1-5' 
WHERE quest_key = 'ATTEND_LIVESTREAM';

-- Verify the updates
SELECT quest_key, title, reward_notes FROM bonus_quests 
WHERE quest_key IN ('INVITE_FRIEND', 'ATTEND_LIVESTREAM');