-- Update bonus quest descriptions and reward notes
UPDATE bonus_quests 
SET 
  description = 'Share the Heartverse with someone you love. When they join, you both earn rewards.',
  reward_notes = '+1 /day'
WHERE quest_key = 'INVITE_FRIEND';

UPDATE bonus_quests 
SET description = 'Check in at a CHXNDLER show to receive bonus rewards.'
WHERE quest_key = 'ATTEND_LIVESTREAM';