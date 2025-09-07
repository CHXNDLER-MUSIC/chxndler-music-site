# 🚀 Supabase Analytics Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project" 
3. Choose a name like "chxndler-music-analytics"
4. Set a secure database password
5. Choose a region close to your users

## Step 2: Install Dependencies

```bash
npm install @supabase/supabase-js
```

## Step 3: Get Your Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy these values:
   - **Project URL** (starts with https://...)
   - **anon/public key** (starts with eyJhbGc...)

## Step 4: Setup Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
ADMIN_SECRET=your-super-secret-admin-key-2024
NEXT_PUBLIC_ADMIN_KEY=your-admin-dashboard-key-2024
```

## Step 5: Create Database Tables

1. In Supabase dashboard, go to SQL Editor
2. Run this SQL to create your analytics tables:

```sql
-- Music Analytics Events Table
CREATE TABLE IF NOT EXISTS music_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event VARCHAR(100) NOT NULL,
  song_id VARCHAR(255),
  song_title TEXT,
  song_icon VARCHAR(100),
  cover_src TEXT,
  hover_method VARCHAR(50),
  session_id VARCHAR(255) NOT NULL,
  user_agent TEXT,
  url TEXT,
  referrer TEXT,
  ip_address INET,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Click Analytics Events Table  
CREATE TABLE IF NOT EXISTS click_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event VARCHAR(100) NOT NULL,
  element_tag VARCHAR(50),
  element_class TEXT,
  element_text TEXT,
  element_label TEXT,
  click_x INTEGER,
  click_y INTEGER,
  page_url TEXT,
  session_id VARCHAR(255) NOT NULL,
  user_agent TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Test Events Table
CREATE TABLE IF NOT EXISTS ab_test_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event VARCHAR(100) NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  variant VARCHAR(255) NOT NULL,
  conversion_type VARCHAR(255),
  conversion_value DECIMAL,
  session_id VARCHAR(255) NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Flow Events Table
CREATE TABLE IF NOT EXISTS user_flow_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_music_events_session ON music_events(session_id);
CREATE INDEX IF NOT EXISTS idx_music_events_song ON music_events(song_id);
CREATE INDEX IF NOT EXISTS idx_music_events_event ON music_events(event);
CREATE INDEX IF NOT EXISTS idx_music_events_created ON music_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_click_events_session ON click_events(session_id);
CREATE INDEX IF NOT EXISTS idx_click_events_created ON click_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ab_test_events_test ON ab_test_events(test_name);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_session ON ab_test_events(session_id);

CREATE INDEX IF NOT EXISTS idx_user_flow_session ON user_flow_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_flow_created ON user_flow_events(created_at DESC);
```

## Step 6: Create Analytics Functions

Run this SQL to create helper functions:

```sql
-- Get popular songs with counts
CREATE OR REPLACE FUNCTION get_popular_songs(song_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  song_id TEXT,
  song_title TEXT,
  interaction_count BIGINT,
  event_types TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    me.song_id,
    me.song_title,
    COUNT(*) as interaction_count,
    ARRAY_AGG(DISTINCT me.event) as event_types
  FROM music_events me
  WHERE me.song_id IS NOT NULL
  GROUP BY me.song_id, me.song_title
  ORDER BY interaction_count DESC
  LIMIT song_limit;
END;
$$ LANGUAGE plpgsql;

-- Get session analytics
CREATE OR REPLACE FUNCTION get_session_analytics(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  session_id TEXT,
  first_event TIMESTAMPTZ,
  last_event TIMESTAMPTZ,
  duration_minutes NUMERIC,
  music_events_count BIGINT,
  unique_songs_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    me.session_id,
    MIN(me.created_at) as first_event,
    MAX(me.created_at) as last_event,
    EXTRACT(EPOCH FROM (MAX(me.created_at) - MIN(me.created_at)))/60 as duration_minutes,
    COUNT(*) as music_events_count,
    COUNT(DISTINCT me.song_id) as unique_songs_count
  FROM music_events me
  WHERE me.created_at > NOW() - INTERVAL '1 day' * days_back
  GROUP BY me.session_id
  ORDER BY first_event DESC;
END;
$$ LANGUAGE plpgsql;
```

## Step 7: Test Your Setup

1. Start your development server: `npm run dev`
2. Go to `/admin` and enter your admin password
3. Interact with your music site (click songs, cover art, etc.)
4. Check the analytics dashboard to see data

## Step 8: View Data in Supabase

You can also view your analytics data directly in Supabase:
1. Go to Table Editor in your Supabase dashboard
2. Click on any table (music_events, click_events, etc.)
3. See real-time data as users interact with your site

## 🎉 You're Done!

Your analytics are now stored permanently in Supabase and won't reset when you redeploy. The free tier gives you:
- 500MB database storage
- 2 million row updates per month
- Unlimited reads

## 🔍 Querying Your Data

You can run SQL queries in Supabase to analyze your data:

```sql
-- Most popular songs
SELECT song_id, song_title, COUNT(*) as plays
FROM music_events 
WHERE event = 'song_selected'
GROUP BY song_id, song_title
ORDER BY plays DESC;

-- Daily user activity
SELECT DATE(created_at) as date, COUNT(DISTINCT session_id) as unique_users
FROM music_events
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Conversion funnel
SELECT 
  event,
  COUNT(*) as count,
  COUNT(DISTINCT session_id) as unique_sessions
FROM music_events
WHERE event IN ('song_hovered', 'song_selected', 'cover_art_clicked', 'start_music')
GROUP BY event;
```

## 🔒 Security Notes

- Your admin passwords are in `.env.local` (not committed to git)
- Only you can access the `/admin` page
- Supabase handles all database security
- Data is encrypted at rest and in transit