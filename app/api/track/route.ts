// app/api/track/route.ts
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

// Ensure this route is never pre-rendered or statically analyzed
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';   // using Node's crypto
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.session_id || !body?.event_type) {
      return NextResponse.json(
        { error: 'Missing session_id or event_type' },
        { status: 400 }
      );
    }

    // — IP & UA (prefer x-forwarded-for; fall back to unknown) —
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      // @ts-expect-error: NextRequest doesn't expose .ip, keep fallback
      (req as any).ip ||
      '0.0.0.0';

    const ip_hash = crypto.createHash('sha256').update(ip).digest('hex');
    const user_agent = body.user_agent || req.headers.get('user-agent') || 'unknown';

    // Lazy init here (NOT at top-level)
    const supabase = getSupabaseAdmin();

    // 1) Touch session via RPC in analytics schema (ignore failures but log)
    const { error: rpcError } = await supabase.rpc('analytics.touch_session', {
      p_session_id: body.session_id,
      p_user_agent: user_agent,
      p_ip_hash: ip_hash,
    });
    if (rpcError) {
      console.error('analytics.touch_session error:', rpcError);
      // Continue; event insert can still succeed
    }

    // 2) Insert event (truncate long strings defensively)
    const { error: insertError } = await supabase
      .from('events')
      .insert({
        session_id: body.session_id,
        event_type: body.event_type,
        page: body.page?.slice(0, 512) ?? null,
        referrer: body.referrer?.slice(0, 512) ?? null,
        song_slug: body.song_slug?.slice(0, 128) ?? null,
        payload: body.payload ?? null,
      });

    if (insertError) {
      console.error('events insert error:', insertError);
      return NextResponse.json({ error: 'DB insert failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('track POST error:', e);
    // If envs are missing, surface a clear 500 so you can see it in logs
    const msg = e?.message || 'Bad request';
    const status = msg.includes('Supabase env') ? 500 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
