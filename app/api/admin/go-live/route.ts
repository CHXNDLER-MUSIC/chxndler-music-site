import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** GET — return current override state (public) */
export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('app_settings')
      .select('value')
      .eq('key', 'go_live_override')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ live: data.value === 'true' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST { "live": true/false } — toggle the flag (admin only) */
export async function POST(req: NextRequest) {
  // Authenticate via Bearer token
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const secret = process.env.ADMIN_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const live = Boolean(body.live);

    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from('app_settings')
      .update({ value: String(live) })
      .eq('key', 'go_live_override');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ live });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
