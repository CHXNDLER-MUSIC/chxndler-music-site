-- Complete Badges System Migration
-- Updates schema to match requirements and populates with actual badge data

BEGIN;

-- Drop existing tables to recreate with correct schema
DROP TABLE IF EXISTS public.user_badges CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;

-- Create badges table with correct schema
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  element text,
  image_url text,
  requirement_type text NOT NULL,
  requirement_value text,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_badges table with correct schema
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

-- Enable Row Level Security
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON TABLE public.badges TO authenticated;
GRANT SELECT, INSERT ON TABLE public.user_badges TO authenticated;

-- Policies for badges (public read)
CREATE POLICY "Authenticated users can read badges"
  ON public.badges
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for user_badges
CREATE POLICY "Users can select their own badges"
  ON public.user_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
  ON public.user_badges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX user_badges_user_id_idx ON public.user_badges(user_id);
CREATE INDEX user_badges_badge_id_idx ON public.user_badges(badge_id);
CREATE INDEX badges_category_idx ON public.badges(category);
CREATE INDEX badges_requirement_type_idx ON public.badges(requirement_type);

-- Insert all badges based on UI assets and categories
INSERT INTO public.badges (title, description, element, image_url, requirement_type, requirement_value, category) VALUES

-- SOUL STAR CATEGORY
('Soul Star', 'Begin your journey of self reflection', 'soul', '/badges/soul star.webp', 'soul_entries', '1', 'soul-star'),
('Soul Ember', 'Complete 3 soul entries with deep introspection', 'soul', '/badges/soul ember.webp', 'soul_entries', '3', 'soul-star'),
('Soul Flame', 'Complete 7 soul entries showing growth', 'soul', '/badges/soul flame.webp', 'soul_entries', '7', 'soul-star'),
('Soul Bloom', 'Complete 14 soul entries revealing insights', 'soul', '/badges/soul bloom.webp', 'soul_entries', '14', 'soul-star'),
('Soul Rise', 'Complete 30 soul entries on your path', 'soul', '/badges/soul rise.webp', 'soul_entries', '30', 'soul-star'),
('Soul Eclipse', 'Complete 50 soul entries achieving mastery', 'soul', '/badges/soul eclipse.webp', 'soul_entries', '50', 'soul-star'),
('Eternal Soul', 'Complete 100 soul entries transcending limits', 'soul', '/badges/eternal soul.webp', 'soul_entries', '100', 'soul-star'),

-- ACHIEVEMENTS CATEGORY
('First Listen', 'Listen to your first CHXNDLER track', 'first', '/badges/first listen.webp', 'tracks_listened', '1', 'achievements'),
('First Contact', 'Join the CHXNDLER community', 'first', '/badges/first contact.webp', 'profile_created', '1', 'achievements'),
('First Spark', 'Complete your first daily quest', 'first', '/badges/first spark.webp', 'daily_quests', '1', 'achievements'),
('Collector', 'Collect your first digital item', 'collector', '/badges/collector.webp', 'items_collected', '1', 'achievements'),
('Digital Collector', 'Collect 10 digital items', 'collector', '/badges/digital collector.webp', 'items_collected', '10', 'achievements'),
('Master Collector', 'Collect 50 digital items', 'collector', '/badges/master collector.webp', 'items_collected', '50', 'achievements'),
('Cosmic Archivist', 'Collect 100 digital items', 'collector', '/badges/cosmic archivist.webp', 'items_collected', '100', 'achievements'),
('Live Witness', 'Attend a live show or stream', 'witness', '/badges/live witness.webp', 'live_events', '1', 'achievements'),
('Eternal Witness', 'Attend 10 live events', 'witness', '/badges/eternal witness.webp', 'live_events', '10', 'achievements'),

-- ELEMENTAL STREAK CATEGORY
('Heart Radiance', 'Complete a 3 day heart element streak', 'heart', '/badges/heart radiance.webp', 'element_streak', '3:heart', 'elemental-streak'),
('Heart Seeker', 'Complete a 7 day heart element streak', 'heart', '/badges/heart seeker.webp', 'element_streak', '7:heart', 'elemental-streak'),
('Heart to Heart', 'Complete a 14 day heart element streak', 'heart', '/badges/heart to heart.webp', 'element_streak', '14:heart', 'elemental-streak'),
('Ocean Surge', 'Complete a 3 day water element streak', 'water', '/badges/ocean surge.webp', 'element_streak', '3:water', 'elemental-streak'),
('Rising Ripple', 'Complete a 7 day water element streak', 'water', '/badges/rising ripple.webp', 'element_streak', '7:water', 'elemental-streak'),
('Shifting Tide', 'Complete a 14 day water element streak', 'water', '/badges/shifting tide.webp', 'element_streak', '14:water', 'elemental-streak'),
('Quick Charge', 'Complete a 3 day lightning element streak', 'lightning', '/badges/quick charge.webp', 'element_streak', '3:lightning', 'elemental-streak'),
('Raging Storm', 'Complete a 7 day lightning element streak', 'lightning', '/badges/raging storm.webp', 'element_streak', '7:lightning', 'elemental-streak'),
('Sky Ascend', 'Complete a 14 day lightning element streak', 'lightning', '/badges/sky ascend.webp', 'element_streak', '14:lightning', 'elemental-streak'),
('Fading Shadow', 'Complete a 3 day darkness element streak', 'darkness', '/badges/fading shadow.webp', 'element_streak', '3:darkness', 'elemental-streak'),
('Silent Veil', 'Complete a 7 day darkness element streak', 'darkness', '/badges/silent veil.webp', 'element_streak', '7:darkness', 'elemental-streak'),
('Black Midnight', 'Complete a 14 day darkness element streak', 'darkness', '/badges/black midnight.webp', 'element_streak', '14:darkness', 'elemental-streak'),

-- LISTENING CATEGORY
('Deep Listener', 'Listen to 10 complete tracks', 'music', '/badges/deep listener.webp', 'tracks_listened', '10', 'listening'),
('Track Devotee', 'Listen to 25 complete tracks', 'music', '/badges/track devotee.webp', 'tracks_listened', '25', 'listening'),
('Track Obsession', 'Listen to 50 complete tracks', 'music', '/badges/track obsession.webp', 'tracks_listened', '50', 'listening'),
('Song Voyager', 'Listen to 100 complete tracks', 'music', '/badges/song voyager.webp', 'tracks_listened', '100', 'listening'),
('Complete Discography', 'Listen to every CHXNDLER track', 'music', '/badges/complete discography.webp', 'tracks_listened', 'all', 'listening'),
('Stream Seeker', 'Participate in 5 live streams', 'streaming', '/badges/stream seeker.webp', 'live_streams', '5', 'listening'),
('Signal Streamer', 'Participate in 15 live streams', 'streaming', '/badges/signal streamer.webp', 'live_streams', '15', 'listening'),

-- HEARTCOIN CATEGORY
('Cosmic Earner', 'Earn your first 100 heartcoins', 'currency', '/badges/cosmic earner.webp', 'heartcoins_earned', '100', 'heartcoin'),
('The Giver', 'Spend 500 heartcoins', 'currency', '/badges/the giver.webp', 'heartcoins_spent', '500', 'heartcoin'),
('Cosmic Donor', 'Spend 1000 heartcoins', 'currency', '/badges/cosmic donor.webp', 'heartcoins_spent', '1000', 'heartcoin'),
('Merch Supporter', 'Purchase merchandise', 'supporter', '/badges/merch supporter.webp', 'merch_purchases', '1', 'heartcoin'),
('Merch Completionism', 'Purchase 5 different merch items', 'supporter', '/badges/merch completionism.webp', 'merch_purchases', '5', 'heartcoin'),

-- COMMUNITY CATEGORY
('Cosmic Supporter', 'Support the community for 30 days', 'community', '/badges/cosmic supporter.webp', 'community_days', '30', 'community'),
('Cosmic Guardian', 'Support the community for 90 days', 'community', '/badges/cosmic guardian.webp', 'community_days', '90', 'community'),
('Heartverse Ascendant', 'Achieve maximum community status', 'community', '/badges/heartverse ascendant.webp', 'community_days', '365', 'community'),
('The Lover', 'Share 10 tracks with friends', 'social', '/badges/the lover.webp', 'shares_made', '10', 'community'),
('True Alien', 'Invite 5 friends to join', 'invite', '/badges/true alien.webp', 'friends_invited', '5', 'community'),
('Cosmic Broadcaster', 'Host a community event', 'broadcast', '/badges/cosmic broadcaster.webp', 'events_hosted', '1', 'community'),
('Orbit Returner', 'Return to the app 30 consecutive days', 'loyalty', '/badges/orbit returner.webp', 'login_streak', '30', 'community');

COMMIT;