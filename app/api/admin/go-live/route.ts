import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getApiUser, isAdminUser, unauthorized, forbidden } from '@/lib/apiAuth';

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
    let videoId: string | null = null;

    if (goLiveRow && typeof goLiveRow.value !== 'undefined') {
      live = parseLiveValue(goLiveRow.value);
      if (typeof goLiveRow.value === 'object' && goLiveRow.value !== null) {
        const raw = goLiveRow.value.videoId;
        if (typeof raw === 'string' && raw.trim()) videoId = raw.trim();
      }
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

    return NextResponse.json({ live, videoId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}

/** POST { "live": true/false } — toggle the flag (admin only) */
export async function POST(_req: Request) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();

  try {
    const body = await req.json();
    const sb = getSupabaseAdmin();

    // next_drop management
    if (body.key === 'next_drop') {
      if (!body.value || typeof body.value !== 'object' || Array.isArray(body.value)) return NextResponse.json({ error: 'Invalid next drop settings.' }, { status: 400 });
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
    if (typeof body.live !== 'boolean') return NextResponse.json({ error: 'Live status must be true or false.' }, { status: 400 });
    const live = body.live;

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
