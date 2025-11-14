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

    // Comms hub (yellow button) total clicks
    const { count: commsClickCount, error: commsErr } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'comms_hub_click');
    if (commsErr) {
      console.error('[metrics] comms hub click query failed:', commsErr);
    }

    // Join Aliens (pink button) total clicks
    const { count: joinPinkClickCount, error: jpErr } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'join_aliens_click');
    if (jpErr) {
      console.error('[metrics] join aliens click query failed:', jpErr);
    }

    // Join Aliens successful submits (optional extra)
    const { count: joinSubmitCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'join_aliens_success');

    // CHXNDLER brand button clicks (HUD brand button)
    const { count: brandClickCount, error: brandErr } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'chxndler_button_clicked');
    if (brandErr) {
      console.error('[metrics] chxndler button click query failed:', brandErr);
    }

    // Store button clicks (HUD gem button)
    const { count: storeButtonCount, error: storeBtnErr } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'store_button_clicked');
    if (storeBtnErr) {
      console.error('[metrics] store button click query failed:', storeBtnErr);
    }

    // HEART coin button clicks (HUD heart coin)
    const { count: heartCoinCount, error: heartErr } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'heart_coin_clicked');
    if (heartErr) {
      console.error('[metrics] heart coin click query failed:', heartErr);
    }

    // Aggregate Spotify/Apple clicks from click_events.element_label
    const socials = { instagram: 0, tiktok: 0, youtube: 0, spotify: 0, apple: 0 } as Record<string, number>;

    // Totals for Spotify/Apple
    const { count: spotifyTotal } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'click')
      .filter('payload->>element_label', 'ilike', '🎵 Spotify%')
      .filter('payload->>element_class', 'ilike', '%holo-hub%');
    const { count: appleTotal } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'click')
      .filter('payload->>element_label', 'ilike', '🎵 Apple Music%')
      .filter('payload->>element_class', 'ilike', '%holo-hub%');
    socials.spotify = spotifyTotal || 0;
    socials.apple = appleTotal || 0;

    // Totals for Instagram/TikTok/YouTube
    const { count: igTotal } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'click')
      .filter('payload->>element_label', 'ilike', '📱 Instagram%')
      .filter('payload->>element_class', 'ilike', '%holo-hub%');
    const { count: ttTotal } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'click')
      .filter('payload->>element_label', 'ilike', '📱 TikTok%')
      .filter('payload->>element_class', 'ilike', '%holo-hub%');
    const { count: ytTotal } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'click')
      .filter('payload->>element_label', 'ilike', '📱 YouTube%')
      .filter('payload->>element_class', 'ilike', '%holo-hub%');
    socials.instagram = igTotal || 0;
    socials.tiktok = ttTotal || 0;
    socials.youtube = ytTotal || 0;

    // Per-song breakdown: fetch labels and group in memory
    const spotifySongClicks: Record<string, { count: number; title: string }> = {};
    const appleSongClicks: Record<string, { count: number; title: string }> = {};
    const lyricsSongClicks: Record<string, { count: number; title: string }> = {};
    const storeItemClicks: Record<string, { count: number; id: string; title: string }> = {};

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

    // Lyrics clicks breakdown
    const lyRows = await supabase
      .from('events')
      .select('payload')
      .eq('event_type', 'click')
      .filter('payload->>element_label', 'ilike', '📝 Lyrics%')
      .limit(5000);
    if (!lyRows.error && Array.isArray(lyRows.data)) {
      for (const r of lyRows.data as Array<{ payload: any }>) {
        const label = (r?.payload?.element_label as string) || '';
        const m = label.match(/^📝\s*Lyrics:\s*(.+)$/i);
        const title = m && m[1] ? m[1].trim() : '';
        const key = (title || 'CHXNDLER').toLowerCase();
        const usedTitle = title || 'CHXNDLER';
        lyricsSongClicks[key] = lyricsSongClicks[key] || { count: 0, title: usedTitle };
        lyricsSongClicks[key].count++;
      }
    }

    // Store item clicks breakdown by payload.item_id and payload.item_title
    const stRows = await supabase
      .from('events')
      .select('payload')
      .eq('event_type', 'store_item_clicked')
      .limit(5000);
    if (!stRows.error && Array.isArray(stRows.data)) {
      for (const r of stRows.data as Array<{ payload: any }>) {
        const pid = String(r?.payload?.item_id || '').toLowerCase();
        const ptitle = String(r?.payload?.item_title || '').trim() || pid || 'item';
        if (!pid && !ptitle) continue;
        const key = pid || ptitle.toLowerCase();
        if (!storeItemClicks[key]) storeItemClicks[key] = { count: 0, id: pid || key, title: ptitle };
        storeItemClicks[key].count++;
      }
    }

    return j(200, {
      pageViews: pageViewCount || 0,
      startClicks: startClickCount || 0,
      commsClicks: commsClickCount || 0,
      socials,
      joinPinkClicks: joinPinkClickCount || 0,
      brandClicks: brandClickCount || 0,
      storeButtonClicks: storeButtonCount || 0,
      heartCoinClicks: heartCoinCount || 0,
      joinSubmitClicks: joinSubmitCount || 0,
      songPlays: {},
      coverClicks: {},
      spotifySongClicks,
      appleSongClicks,
      lyricsSongClicks,
      storeItemClicks,
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
