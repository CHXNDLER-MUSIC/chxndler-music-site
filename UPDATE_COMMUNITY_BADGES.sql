-- Update community badges to use correct profile counter columns
-- Safe to run multiple times

BEGIN;

-- Update the Live Witness badge requirement type to use livestreams_attended
UPDATE public.badges
SET
  requirement_type = 'livestreams_attended',
  requirement_count = 1,
  category = 'community'
WHERE badge_name = 'Live Witness'
  OR slug = 'live_witness'
  OR slug = 'live-witness';

-- Update the Portal Opener badge requirement type to use aliens_invited
UPDATE public.badges
SET
  requirement_type = 'aliens_invited',
  requirement_count = 1,
  category = 'community'
WHERE badge_name = 'Portal Opener'
  OR slug = 'portal_opener'
  OR slug = 'portal-opener';

-- Update the First Contact badge requirement type to use concerts_attended
UPDATE public.badges
SET
  requirement_type = 'concerts_attended',
  requirement_count = 1,
  category = 'community'
WHERE badge_name = 'First Contact'
  OR slug = 'first_contact'
  OR slug = 'first-contact';

-- Update the Heartverse Ambassador badge requirement type to use aliens_invited
-- Keep existing requirement_count, only update the requirement_type
UPDATE public.badges
SET
  requirement_type = 'aliens_invited',
  category = 'community'
WHERE badge_name = 'Heartverse Ambassador'
  OR slug = 'heartverse_ambassador'
  OR slug = 'heartverse-ambassador';

-- Verify the updates
DO $$
DECLARE
  live_witness_count INTEGER;
  portal_opener_count INTEGER;
  first_contact_count INTEGER;
  ambassador_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO live_witness_count
  FROM public.badges
  WHERE (badge_name = 'Live Witness' OR slug = 'live_witness' OR slug = 'live-witness')
    AND requirement_type = 'livestreams_attended';

  SELECT COUNT(*) INTO portal_opener_count
  FROM public.badges
  WHERE (badge_name = 'Portal Opener' OR slug = 'portal_opener' OR slug = 'portal-opener')
    AND requirement_type = 'aliens_invited';

  SELECT COUNT(*) INTO first_contact_count
  FROM public.badges
  WHERE (badge_name = 'First Contact' OR slug = 'first_contact' OR slug = 'first-contact')
    AND requirement_type = 'concerts_attended';

  SELECT COUNT(*) INTO ambassador_count
  FROM public.badges
  WHERE (badge_name = 'Heartverse Ambassador' OR slug = 'heartverse_ambassador' OR slug = 'heartverse-ambassador')
    AND requirement_type = 'aliens_invited';

  IF live_witness_count > 0 THEN
    RAISE NOTICE 'Successfully updated Live Witness badge to use livestreams_attended';
  ELSE
    RAISE NOTICE 'Live Witness badge not found or already updated';
  END IF;

  IF portal_opener_count > 0 THEN
    RAISE NOTICE 'Successfully updated Portal Opener badge to use aliens_invited';
  ELSE
    RAISE NOTICE 'Portal Opener badge not found or already updated';
  END IF;

  IF first_contact_count > 0 THEN
    RAISE NOTICE 'Successfully updated First Contact badge to use concerts_attended';
  ELSE
    RAISE NOTICE 'First Contact badge not found or already updated';
  END IF;

  IF ambassador_count > 0 THEN
    RAISE NOTICE 'Successfully updated Heartverse Ambassador badge to use aliens_invited';
  ELSE
    RAISE NOTICE 'Heartverse Ambassador badge not found or already updated';
  END IF;
END $$;

COMMIT;
