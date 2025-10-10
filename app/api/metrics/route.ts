// app/api/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';

function j(status: number, data?: unknown) {
  return new NextResponse(data ? JSON.stringify(data) : null, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(_req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return j(500, { error: 'Supabase environment variables not set' });
  }

  try {
    // Test basic connection first
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      db: { schema: 'public' },
    });

    // Quick connection test - check if events table exists
    const testConnection = await supabase
      .from('events')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    if (testConnection.error) {
      console.error('[metrics] connection test failed:', testConnection.error);
      return j(500, { 
        error: 'Database connection failed', 
        details: testConnection.error.message,
        debug: {
          url: SUPABASE_URL ? 'present' : 'missing',
          key: SERVICE_ROLE_KEY ? 'present' : 'missing'
        }
      });
    }

    // Simple page view count
    const { count: pageViewCount, error: pvError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'page_view');

    if (pvError) {
      console.error('[metrics] page view query failed:', pvError);
      return j(500, { error: 'Page view query failed', details: pvError.message });
    }

    // Simple start button clicks count
    const { count: startClickCount, error: scError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'start_button_clicked');

    if (scError) {
      console.error('[metrics] start click query failed:', scError);
    }

    // Aggregate Spotify/Apple clicks from click_events.element_label
    const socials = { instagram: 0, tiktok: 0, youtube: 0, spotify: 0, apple: 0 } as Record<string, number>;

    // Totals for Spotify/Apple
    const { count: spotifyTotal } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'click')
      .filter('payload->>element_label', 'ilike', '🎵 Spotify%');
    const { count: appleTotal } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'click')
      .filter('payload->>element_label', 'ilike', '🎵 Apple Music%');
    socials.spotify = spotifyTotal || 0;
    socials.apple = appleTotal || 0;

    // Per-song breakdown: fetch labels and group in memory
    const spotifySongClicks: Record<string, { count: number; title: string }> = {};
    const appleSongClicks: Record<string, { count: number; title: string }> = {};

    const spRows = await supabase
      .from('events')
      .select('payload')
      .eq('event_type', 'click')
      .filter('payload->>element_label', 'ilike', '🎵 Spotify%')
      .limit(5000);
    if (!spRows.error && Array.isArray(spRows.data)) {
      for (const r of spRows.data as Array<{ payload: any }>) {
        const label = (r?.payload?.element_label as string) || '';
        const m = label.match(/^🎵\s*Spotify:\s*(.+)$/i);
        const title = m && m[1] ? m[1].trim() : '';
        if (!title) continue;
        const key = title.toLowerCase();
        spotifySongClicks[key] = spotifySongClicks[key] || { count: 0, title };
        spotifySongClicks[key].count++;
      }
    }

    const amRows = await supabase
      .from('events')
      .select('payload')
      .eq('event_type', 'click')
      .filter('payload->>element_label', 'ilike', '🎵 Apple Music%')
      .limit(5000);
    if (!amRows.error && Array.isArray(amRows.data)) {
      for (const r of amRows.data as Array<{ payload: any }>) {
        const label = (r?.payload?.element_label as string) || '';
        const m = label.match(/^🎵\s*Apple\s*Music:\s*(.+)$/i);
        const title = m && m[1] ? m[1].trim() : '';
        if (!title) continue;
        const key = title.toLowerCase();
        appleSongClicks[key] = appleSongClicks[key] || { count: 0, title };
        appleSongClicks[key].count++;
      }
    }

    return j(200, {
      pageViews: pageViewCount || 0,
      startClicks: startClickCount || 0,
      commsClicks: 0,
      socials,
      joinPinkClicks: 0,
      joinSubmitClicks: 0,
      songPlays: {},
      coverClicks: {},
      spotifySongClicks,
      appleSongClicks,
      debug: {
        connectionTest: 'passed',
        totalEvents: testConnection.count || 0
      }
    });
  } catch (e: any) {
    console.error('[metrics] unexpected error:', e);
    return j(500, { 
      error: e?.message || 'Unexpected error',
      stack: e?.stack,
      debug: {
        url: SUPABASE_URL ? 'present' : 'missing',
        key: SERVICE_ROLE_KEY ? 'present' : 'missing'
      }
    });
  }
}
