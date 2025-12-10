-- Add "ocean girl" as a secret phrase
-- Run this in Supabase SQL runner or dashboard

INSERT INTO public.secret_phrases (
  code,
  label,
  context,
  start_at,
  end_at,
  reward_heart_coins
) VALUES (
  'ocean girl',
  'Ocean Girl Song - Test Secret Phrase',
  'global',
  NOW(),
  NOW() + INTERVAL '30 days',
  5
);

-- Verify the insert
SELECT * FROM public.secret_phrases WHERE code = 'ocean girl';