import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { DEFAULT_CAMPAIGN, DEFAULT_SOURCE, isTipEvent } from '@/lib/tip/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clampStr(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const event = body?.event;
    if (!isTipEvent(event)) {
      // Unknown event name — accept silently so the client never retries.
      return NextResponse.json({ ok: true });
    }

    const sessionId = clampStr(body?.sessionId, 80);
    const source = clampStr(body?.source, 120) ?? DEFAULT_SOURCE;
    const campaign = clampStr(body?.campaign, 120) ?? DEFAULT_CAMPAIGN;
    const amountCents =
      Number.isInteger(body?.amountCents) && body.amountCents >= 0 && body.amountCents <= 5_000_00
        ? body.amountCents
        : null;
    const provider = clampStr(body?.provider, 40);
    const stripePaymentIntentId = clampStr(body?.stripePaymentIntentId, 120);
    const metadata =
      body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    // Coarse, non-invasive context only. No IP is stored.
    const referrer =
      clampStr(body?.referrer, 500) ?? clampStr(req.headers.get('referer'), 500);
    const country =
      req.headers.get('x-vercel-ip-country') ||
      req.headers.get('cf-ipcountry') ||
      null;
    const userAgent = clampStr(req.headers.get('user-agent'), 500);
    const device = clampStr(body?.device, 20);
    const browser = clampStr(body?.browser, 40);

    const admin = getSupabaseAdmin();
    const now = new Date().toISOString();

    if (sessionId) {
      // Upsert the session row; only ever move last_seen_at forward.
      await admin
        .from('tip_sessions')
        .upsert(
          {
            id: sessionId,
            last_seen_at: now,
            source,
            campaign,
            referrer,
            device_category: device,
            browser,
            country,
            user_agent: userAgent,
          },
          { onConflict: 'id', ignoreDuplicates: false },
        );
    }

    await admin.from('tip_events').insert({
      session_id: sessionId,
      event_type: event,
      amount_cents: amountCents,
      source,
      campaign,
      provider,
      stripe_payment_intent_id: stripePaymentIntentId,
      metadata,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[tip/track] error', err);
    // Analytics must never surface an error to the visitor.
    return NextResponse.json({ ok: true });
  }
}
