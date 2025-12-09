-- Insert sample badges with categories
-- Safe to run multiple times (uses ON CONFLICT)

begin;

INSERT INTO public.badges (badge_name, icon_url, description, requirement, category) VALUES
-- Soul Star badges
('Soul Star', '/badges/soul star.webp', 'Your first reflection journal entry', 'Write your first soul journal reflection', 'soul'),
('Soul Ember', '/badges/soul star.webp', 'Three reflections completed', 'Write 3 soul journal reflections', 'soul'),
('Soul Flame', '/badges/soul star.webp', 'A week of reflections', 'Write 7 soul journal reflections', 'soul'),
('Soul Bloom', '/badges/soul star.webp', 'Two weeks of reflection', 'Write 14 soul journal reflections', 'soul'),
('Soul Rise', '/badges/soul star.webp', 'A month of reflection', 'Write 30 soul journal reflections', 'soul'),

-- Achievement badges
('First Steps', '/badges/collector.webp', 'Welcome to the music journey', 'Complete your first login', 'collector'),
('Collector', '/badges/collector.webp', 'Badge collecting enthusiast', 'Earn 5 different badges', 'collector'),
('Witness', '/badges/collector.webp', 'Witnessed the experience', 'Stay active for 7 consecutive days', 'collector'),
('Supporter', '/badges/collector.webp', 'Supporting the community', 'Invite a friend to join', 'collector'),

-- Elemental Streak badges
('Heart Element', '/badges/elemental streak.webp', 'Connected with heart energy', 'Listen during heart element phase', 'elemental-streak'),
('Water Element', '/badges/elemental streak.webp', 'Flowed with water energy', 'Listen during water element phase', 'elemental-streak'),
('Lightning Element', '/badges/elemental streak.webp', 'Energized with lightning', 'Listen during lightning element phase', 'elemental-streak'),
('Darkness Element', '/badges/elemental streak.webp', 'Embraced the darkness', 'Listen during darkness element phase', 'elemental-streak'),

-- Listening badges
('Music Explorer', '/badges/listening.webp', 'Explored the soundscape', 'Listen to 10 different tracks', 'listening'),
('Song Keeper', '/badges/listening.webp', 'Dedicated listener', 'Listen for 1 hour total', 'listening'),
('Melody Master', '/badges/listening.webp', 'Music enthusiast', 'Listen for 10 hours total', 'listening'),

-- HeartCoin badges
('First Coin', '/badges/currency.webp', 'Your first HeartCoin', 'Earn your first HeartCoin', 'currency'),
('Coin Collector', '/badges/currency.webp', 'Building your treasury', 'Earn 100 HeartCoins', 'currency'),
('Treasure Keeper', '/badges/currency.webp', 'Wealthy in hearts', 'Earn 1000 HeartCoins', 'currency'),

-- Community badges
('Community Member', '/badges/community.webp', 'Part of the community', 'Join the community space', 'community'),
('Friend Maker', '/badges/community.webp', 'Making connections', 'Connect with 5 community members', 'community'),
('Community Leader', '/badges/community.webp', 'Leading by example', 'Help onboard 3 new members', 'community')

ON CONFLICT (badge_name) DO UPDATE SET
  icon_url = EXCLUDED.icon_url,
  description = EXCLUDED.description,
  requirement = EXCLUDED.requirement,
  category = EXCLUDED.category;

commit;