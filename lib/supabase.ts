// First, install: npm install @supabase/supabase-js
// Then create your Supabase project at https://supabase.com

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // We're not using auth for analytics
  }
});

// Database Tables Schema (run this in Supabase SQL editor)
export const ANALYTICS_SCHEMA = `
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

-- Indexes for better query performance
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
`;

// Analytics service class
export class SupabaseAnalytics {
  // Store music event
  static async trackMusicEvent(data: {
    event: string;
    song_id?: string;
    song_title?: string;
    song_icon?: string;
    cover_src?: string;
    hover_method?: string;
    session_id: string;
    user_agent?: string;
    url?: string;
    referrer?: string;
    ip_address?: string;
    metadata?: any;
  }) {
    try {
      const { error } = await supabase
        .from('music_events')
        .insert([data]);
      
      if (error) {
        console.error('[Supabase] Error inserting music event:', error);
        return { success: false, error };
      }
      
      return { success: true };
    } catch (error) {
      console.error('[Supabase] Exception inserting music event:', error);
      return { success: false, error };
    }
  }

  // Store click event
  static async trackClickEvent(data: {
    event: string;
    element_tag?: string;
    element_class?: string;
    element_text?: string;
    element_label?: string;
    click_x?: number;
    click_y?: number;
    page_url?: string;
    session_id: string;
    user_agent?: string;
    viewport_width?: number;
    viewport_height?: number;
  }) {
    try {
      const { error } = await supabase
        .from('click_events')
        .insert([data]);
      
      if (error) {
        console.error('[Supabase] Error inserting click event:', error);
        return { success: false, error };
      }
      
      return { success: true };
    } catch (error) {
      console.error('[Supabase] Exception inserting click event:', error);
      return { success: false, error };
    }
  }

  // Store A/B test event
  static async trackABTestEvent(data: {
    event: string;
    test_name: string;
    variant: string;
    conversion_type?: string;
    conversion_value?: number;
    session_id: string;
    user_agent?: string;
  }) {
    try {
      const { error } = await supabase
        .from('ab_test_events')
        .insert([data]);
      
      return { success: !error, error };
    } catch (error) {
      console.error('[Supabase] Exception inserting A/B test event:', error);
      return { success: false, error };
    }
  }

  // Store user flow event
  static async trackUserFlowEvent(data: {
    step: string;
    session_id: string;
    metadata?: any;
  }) {
    try {
      const { error } = await supabase
        .from('user_flow_events')
        .insert([data]);
      
      return { success: !error, error };
    } catch (error) {
      console.error('[Supabase] Exception inserting user flow event:', error);
      return { success: false, error };
    }
  }

  // Admin queries (require authentication)
  static async getMusicAnalytics(limit = 1000) {
    try {
      const { data, error } = await supabase
        .from('music_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      return { success: !error, data, error };
    } catch (error) {
      return { success: false, data: null, error };
    }
  }

  static async getPopularSongs(limit = 10) {
    try {
      const { data, error } = await supabase
        .rpc('get_popular_songs', { song_limit: limit });
      
      return { success: !error, data, error };
    } catch (error) {
      return { success: false, data: null, error };
    }
  }

  static async getSessionFlow(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('user_flow_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      return { success: !error, data, error };
    } catch (error) {
      return { success: false, data: null, error };
    }
  }
}

// SQL functions to create in Supabase (run in SQL editor)
export const ANALYTICS_FUNCTIONS = `
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
`;

export default SupabaseAnalytics;