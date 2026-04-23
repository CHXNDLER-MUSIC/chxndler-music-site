import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function parseLiveValue(value: any): boolean {
  if (
    value === true ||
    value === 'true' ||
    value === 1 ||
    value === '1'
  ) {
    return true;
  }

  if (
    value === false ||
    value === 'false' ||
    value === 0 ||
    value === '0' ||
    value == null
  ) {
    return false;
  }

  if (typeof value === 'object') {
    const nested = value?.live;
    return (
      nested === true ||
      nested === 'true' ||
      nested === 1 ||
      nested === '1'
    );
  }

  return false;
}

/** GET — return current override state (public) */
export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    // Prefer go_live_override, fallback to legacy 'live'
    const { data: goLiveRow, error: goLiveError } = await sb
      .from('app_settings')
      .select('value')
      .eq('key', 'go_live_override')
      .maybeSingle();

    if (goLiveError) {
      return NextResponse.json({ error: goLiveError.message }, { status: 500 });
    }

    let live = false;

    if (goLiveRow && typeof goLiveRow.value !== 'undefined') {
      live = parseLiveValue(goLiveRow.value);
    } else {
      const { data: legacyRow, error: legacyError } = await sb
        .from('app_settings')
        .select('value')
        .eq('key', 'live')
        .maybeSingle();

      if (legacyError) {
        return NextResponse.json({ error: legacyError.message }, { status: 500 });
      }

      live = parseLiveValue(legacyRow?.value);
    }

    return NextResponse.json({ live });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}

/** POST { "live": true/false } — toggle the flag (admin only) */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const secret = process.env.ADMIN_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const sb = getSupabaseAdmin();

    // next_drop management
    if (body.key === 'next_drop') {
      const { error } = await sb
        .from('app_settings')
        .upsert(
          { key: 'next_drop', value: body.value ?? {} },
          { onConflict: 'key' }
        );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ key: 'next_drop', value: body.value ?? null });
    }

    // go_live_override management
    const live = Boolean(body.live);

    const { error } = await sb
      .from('app_settings')
      .upsert(
        { key: 'go_live_override', value: { live } },
        { onConflict: 'key' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ live });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}