// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';          // required if using Node 'crypto'
export const dynamic = 'force-dynamic';   // never pre-render
export const revalidate = 0;

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ---- Env setup --------------------------------------------------------------
// You must have these in Vercel (Production env):
// - SUPABASE_URL  (or NEXT_PUBLIC_SUPABASE_URL)
// - SUPABASE_SERVICE_ROLE_KEY  (service role key, not anon key)
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';

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

export function OPTIONS() {
  return j(204);
}

type Body = {
  session_id?: string;
  event_type?: string;
  page?: string;
  referrer?: string;
  song_slug?: string;
  payload?: Record<string, any>;
  user_agent?: string;
};

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return j(500, { error: 'Server misconfiguration' });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.session_id || !body.event_type) {
      return j(400, { error: 'Missing session_id or event_type' });
    }

    // Derive IP + UA (hash IP for privacy)
    const fwd = req.headers.get('x-forwarded-for') || '';
    const ip = fwd.split(',')[0]?.trim() || '0.0.0.0';
    const ip_hash = crypto.createHash('sha256').update(ip).digest('hex');
    const ua = body.user_agent || req.headers.get('user-agent') || 'unknown';

    // Supabase admin client, using public schema
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      db: { schema: 'public' },
    });

    // OPTIONAL: touch_session RPC; ignore failures so tracking never 500s
    try {
      const { error: rpcError } = await supabase.rpc('touch_session', {
        p_session_id: body.session_id,
        p_user_agent: ua,
        p_ip_hash: ip_hash,
      });
      if (rpcError) console.warn('touch_session error:', rpcError.message);
    } catch (e) {
      console.warn('touch_session call failed:', e);
    }

    // Insert event into events table (if it exists)
    try {
      const { error } = await supabase.from('events').insert({
        session_id: body.session_id,
        event_type: body.event_type,
        page: body.page?.slice(0, 512) ?? null,
        referrer: body.referrer?.slice(0, 512) ?? null,
        song_slug: body.song_slug?.slice(0, 128) ?? null,
        payload: body.payload ?? null,
        user_agent: ua,
        ip_hash,
      });

      if (error) {
        console.warn('events insert error (table may not exist):', error);
        // Don't return 500 - analytics is optional
      }
    } catch (e) {
      console.warn('events insert failed (table may not exist):', e);
      // Don't return 500 - analytics is optional
    }

    // Success: no content needed
    return j(204);
  } catch (e: any) {
    console.error('/api/track unexpected error:', e);
    return j(500, { error: e?.message || 'Unexpected server error' });
  }
}
