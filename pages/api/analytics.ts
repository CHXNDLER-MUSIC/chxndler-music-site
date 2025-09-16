import type { NextApiRequest, NextApiResponse } from 'next';
import SupabaseAnalytics from '../../lib/supabase';

// Admin authentication
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your-secret-key-change-this';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { event, data, sessionId, userAgent, url, referrer } = req.body;

      // Determine which table to use based on event type
      let result;
      
      if (event === 'song_selected' || event === 'cover_art_clicked' || event === 'song_hovered' || event === 'start_music') {
        // Music event
        result = await SupabaseAnalytics.trackMusicEvent({
          event,
          song_id: data?.song_id,
          song_title: data?.song_title,
          song_icon: data?.song_icon,
          cover_src: data?.cover_src,
          hover_method: data?.hover_method,
          session_id: sessionId,
          user_agent: userAgent,
          url,
          referrer,
          ip_address: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress,
          metadata: data
        });
      } else if (event === 'ab_test_assigned' || event === 'ab_test_conversion') {
        // A/B test event
        result = await SupabaseAnalytics.trackABTestEvent({
          event,
          test_name: data?.test_name || data?.testName,
          variant: data?.variant,
          conversion_type: data?.conversion_type || data?.conversionType,
          conversion_value: data?.value,
          session_id: sessionId,
          user_agent: userAgent
        });
      } else if (event === 'user_flow_step') {
        // User flow event
        result = await SupabaseAnalytics.trackUserFlowEvent({
          step: data?.step,
          session_id: sessionId,
          metadata: data
        });
      } else if (event === 'click') {
        // Click event
        result = await SupabaseAnalytics.trackClickEvent({
          event,
          element_tag: data?.element_tag,
          element_class: data?.element_class,
          element_text: data?.element_text,
          element_label: data?.element_label,
          click_x: data?.click_x,
          click_y: data?.click_y,
          page_url: data?.page_url,
          session_id: sessionId,
          user_agent: userAgent,
          viewport_width: data?.viewport_width,
          viewport_height: data?.viewport_height
        });
      } else {
        // Generic music event for other types
        result = await SupabaseAnalytics.trackMusicEvent({
          event,
          session_id: sessionId,
          user_agent: userAgent,
          url,
          referrer,
          metadata: data
        });
      }

      if (result.success) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('[Analytics API] Error storing event:', error);
      res.status(500).json({ success: false, error: 'Failed to store event' });
    }
  } 
  else if (req.method === 'GET') {
    // Admin access only
    const authHeader = req.headers.authorization;
    const adminKey = req.headers['x-admin-key'];
    
    if (adminKey !== ADMIN_SECRET && authHeader !== `Bearer ${ADMIN_SECRET}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      // Get music analytics from Supabase
      const { limit = '100' } = req.query;
      const result = await SupabaseAnalytics.getMusicAnalytics(parseInt(limit as string));

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          total: result.data?.length || 0,
        });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('[Analytics API] Error retrieving events:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve events' });
    }
  } 
  else {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Export analytics data for other API routes (admin only)
export async function getAnalyticsData(adminSecret?: string) {
  if (adminSecret !== ADMIN_SECRET) {
    throw new Error('Unauthorized access to analytics data');
  }
  return await SupabaseAnalytics.getMusicAnalytics(1000);
}

// Clear analytics data (admin only) - Note: This would require custom SQL in production
export function clearAnalyticsData(adminSecret?: string) {
  if (adminSecret !== ADMIN_SECRET) {
    throw new Error('Unauthorized access to analytics data');
  }
  // In production, you'd run: DELETE FROM music_events, click_events, etc.
  console.warn('[Analytics] Clear function not implemented for Supabase - use SQL directly');
  return { success: false, error: 'Use Supabase dashboard to clear data' };
}
