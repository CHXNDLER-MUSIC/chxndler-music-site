import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type Body = {
  session_id: string;
  event_type: string;
  page?: string;
  referrer?: string;
  song_slug?: string;
  payload?: Record<string, any>;
  user_agent?: string;
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

function json(status: number, data?: unknown) {
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
  return json(204);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.session_id || !body?.event_type) {
      return json(400, { error: 'Missing session_id or event_type' });
    }

    // IP & UA
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      (req as any).ip ||
      '0.0.0.0';
    const ip_hash = crypto.createHash('sha256').update(ip).digest('hex');
    const user_agent = body.user_agent || req.headers.get('user-agent') || 'unknown';

    const supabase = getSupabaseAdmin(); // now bound to analytics schema

    // Touch session via RPC (now call without schema prefix)
    try {
      const { error: rpcError } = await supabase.rpc('touch_session', {
        p_session_id: body.session_id,
        p_user_agent: user_agent,
        p_ip_hash: ip_hash,
      });
      if (rpcError) console.error('touch_session error:', rpcError.message);
    } catch (e) {
      console.error('touch_session call failed:', e);
    }

    // Insert event into analytics.events
    const { error: insertError } = await supabase.from('events').insert({
      session_id: body.session_id,
      event_type: body.event_type,
      page: body.page?.slice(0, 512) ?? null,
      referrer: body.referrer?.slice(0, 512) ?? null,
      song_slug: body.song_slug?.slice(0, 128) ?? null,
      payload: body.payload ?? null,
      user_agent,
      ip_hash,
    });
    if (insertError) {
      console.error('events insert error:', insertError.message);
      return json(500, { error: 'DB insert failed' });
    }

    return json(204); // success, no content
  } catch (e: any) {
    console.error('track POST error:', e);
    return json(500, { error: e?.message || 'Unexpected server error' });
  }
}
