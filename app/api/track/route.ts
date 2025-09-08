// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function j(status: number, data?: unknown) {
  return new NextResponse(data ? JSON.stringify(data) : null, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export function OPTIONS() { return j(204); }

export async function POST(req: NextRequest) {
  try {
    const { session_id, event_type, page, referrer, song_slug, payload, user_agent } =
      await req.json();

    if (!session_id || !event_type) return j(400, { error: 'Missing session_id or event_type' });

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || '0.0.0.0';
    const ip_hash = crypto.createHash('sha256').update(ip).digest('hex');
    const ua = user_agent || req.headers.get('user-agent') || 'unknown';

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
      db: { schema: 'analytics' }, // your tables live here
    });

    // INSERT ONLY (no RPC yet)
    const { error } = await supabase.from('events').insert({
      session_id,
      event_type,
      page: page?.slice(0, 512) ?? null,
      referrer: referrer?.slice(0, 512) ?? null,
      song_slug: song_slug?.slice(0, 128) ?? null,
      payload: payload ?? null,
      user_agent: ua,
      ip_hash,
    });

    if (error) {
      console.error('events insert error:', error);
      return j(500, { error: 'DB insert failed' });
    }

    return j(204);
  } catch (e: any) {
    console.error('/api/track error:', e);
    return j(500, { error: e?.message || 'Unexpected server error' });
  }
}
