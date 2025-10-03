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
  // Read from public schema where events are stored
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    db: { schema: 'public' },
  });

  const countHead = async (builder: any) => {
    const { count, error } = await builder.select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  };

  try {
    const [
      startClicks,
      commsClicks,
      ig,
      tt,
      yt,
      sp,
      am,
      joinPinkByLabel,
      joinExplicit,
      joinSubmitClicks,
    ] = await Promise.all([
      countHead(supabase.from('events').eq('event_type', 'start_button_clicked')),
      countHead(supabase.from('events').eq('event_type', 'click').contains('payload', { element_label: '📡 Comms Hub' })),
      countHead(supabase.from('events').eq('event_type', 'click').contains('payload', { element_label: '📱 Instagram' })),
      countHead(supabase.from('events').eq('event_type', 'click').contains('payload', { element_label: '📱 TikTok' })),
      countHead(supabase.from('events').eq('event_type', 'click').contains('payload', { element_label: '📱 YouTube' })),
      countHead(supabase.from('events').eq('event_type', 'click').contains('payload', { element_label: '🎵 Spotify' })),
      countHead(supabase.from('events').eq('event_type', 'click').contains('payload', { element_label: '🎵 Apple Music' })),
      countHead(supabase.from('events').eq('event_type', 'click').contains('payload', { element_label: '🚀 Join Aliens' })),
      countHead(supabase.from('events').eq('event_type', 'join_aliens_click')),
      countHead(supabase.from('events').eq('event_type', 'join_aliens_submit')),
    ]);

    // Unique page views: distinct session_id that recorded a page_view on the opening page
    // Opening page is '/' or '/?...'. Query in two parts to avoid PostgREST or() quirks with '?'
    const pvSet = new Set<string>();
    const pvExact = await supabase
      .from('events')
      .select('session_id')
      .eq('event_type', 'page_view')
      .eq('page', '/');
    if (pvExact.error && !pvExact.error.message?.includes('schema cache')) throw pvExact.error;
    (pvExact.data || []).forEach((row: any) => { if (row?.session_id) pvSet.add(String(row.session_id)); });

    const pvQuery = await supabase
      .from('events')
      .select('session_id, page')
      .eq('event_type', 'page_view')
      .like('page', '/?%');
    if (pvQuery.error && !pvQuery.error.message?.includes('schema cache')) throw pvQuery.error;
    (pvQuery.data || []).forEach((row: any) => { if (row?.session_id) pvSet.add(String(row.session_id)); });

    const pageViews = pvSet.size;

    // Aggregate song plays (music_started) and cover art clicks
    const playsRes = await supabase
      .from('events')
      .select('song_slug, payload, event_type')
      .in('event_type', ['music_started', 'song_selected'])
      .limit(20000);
    if (playsRes.error && !playsRes.error.message?.includes('schema cache')) throw playsRes.error;

    const coverRes = await supabase
      .from('events')
      .select('song_slug, payload')
      .eq('event_type', 'cover_art_clicked')
      .limit(10000);
    if (coverRes.error && !coverRes.error.message?.includes('schema cache')) throw coverRes.error;

    const songPlays: Record<string, { count: number; title?: string }> = {};
    (playsRes.data || []).forEach((row: any) => {
      const slug = (row.song_slug || '').toLowerCase();
      const title = row?.payload?.song_title || undefined;
      if (!slug) return;
      if (!songPlays[slug]) songPlays[slug] = { count: 0, title };
      songPlays[slug].count++;
      if (!songPlays[slug].title && title) songPlays[slug].title = title;
    });

    const coverClicks: Record<string, { count: number; title?: string }> = {};
    (coverRes.data || []).forEach((row: any) => {
      const slug = (row.song_slug || '').toLowerCase();
      const title = row?.payload?.song_title || undefined;
      if (!slug) return;
      if (!coverClicks[slug]) coverClicks[slug] = { count: 0, title };
      coverClicks[slug].count++;
      if (!coverClicks[slug].title && title) coverClicks[slug].title = title;
    });

    return j(200, {
      pageViews,
      startClicks,
      commsClicks,
      socials: { instagram: ig, tiktok: tt, youtube: yt, spotify: sp, apple: am },
      joinPinkClicks: joinPinkByLabel + joinExplicit,
      joinSubmitClicks,
      songPlays,
      coverClicks,
    });
  } catch (e: any) {
    console.error('[metrics] error:', e);
    return j(500, { error: e?.message || 'Failed to load metrics' });
  }
}
