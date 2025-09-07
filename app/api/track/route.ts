import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

type Body = {
  session_id: string;
  event_type: string;
  page?: string;
  referrer?: string;
  song_slug?: string;
  payload?: Record<string, any>;
  user_agent?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.session_id || !body?.event_type) {
      return NextResponse.json({ error: 'Missing session_id or event_type' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.ip || '0.0.0.0';
    const ip_hash = crypto.createHash('sha256').update(ip).digest('hex');
    const user_agent = body.user_agent || req.headers.get('user-agent') || 'unknown';

    const { error: rpcError } = await supabaseAdmin.rpc('touch_session', {
      p_session_id: body.session_id,
      p_user_agent: user_agent,
      p_ip_hash: ip_hash,
    });
    if (rpcError) console.error('touch_session error:', rpcError);

    const { error } = await supabaseAdmin
      .from('analytics.events')
      .insert({
        session_id: body.session_id,
        event_type: body.event_type,
        page: body.page?.slice(0, 512),
        referrer: body.referrer?.slice(0, 512),
        song_slug: body.song_slug?.slice(0, 128),
        payload: body.payload ?? null,
      });

    if (error) {
      console.error('Insert event error:', error);
      return NextResponse.json({ error: 'DB insert failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}