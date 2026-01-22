// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';

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
  page?: string;       // can be URL or pathname
  referrer?: string;
  song_slug?: string;
  payload?: Record<string, any>;
  user_agent?: string;
};

function firstHeader(req: NextRequest, names: string[]) {
  for (const n of names) {
    const v = req.headers.get(n);
    if (v) return v;
  }
  return null;
}

function safeParseURL(page?: string) {
  if (!page) return null;
  try {
    // supports absolute URL
    return new URL(page);
  } catch {
    // supports "/path?x=y"
    try {
      return new URL(page, 'http://localhost');
    } catch {
      return null;
    }
  }
}

function parseUTMs(page?: string) {
  const u = safeParseURL(page);
  const sp = u?.searchParams;
  return {
    utm_source: sp?.get('utm_source') ?? null,
    utm_medium: sp?.get('utm_medium') ?? null,
    utm_campaign: sp?.get('utm_campaign') ?? null,
    landing_path: u ? u.pathname : (page?.startsWith('/') ? page : null),
  };
}

function deriveDeviceType(ua: string) {
  const s = ua.toLowerCase();
  if (s.includes('ipad') || s.includes('tablet')) return 'tablet';
  if (s.includes('mobi') || s.includes('iphone') || s.includes('android')) return 'mobile';
  return 'desktop';
}

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

    // IP + UA (hash IP for privacy)
    const fwd = req.headers.get('x-forwarded-for') || '';
    const ip = fwd.split(',')[0]?.trim() || '0.0.0.0';
    const ip_hash = crypto.createHash('sha256').update(ip).digest('hex');
    const ua = body.user_agent || req.headers.get('user-agent') || 'unknown';

    // Geo headers (Vercel / common proxies)
    const country =
      firstHeader(req, ['x-vercel-ip-country', 'cf-ipcountry']) ?? null;

    const region =
      firstHeader(req, ['x-vercel-ip-country-region', 'x-region', 'cf-region']) ?? null;

    const city =
      firstHeader(req, ['x-vercel-ip-city', 'x-city', 'cf-ipcity']) ?? null;

    const language =
      (req.headers.get('accept-language') || '').split(',')[0]?.trim() || null;

    const { utm_source, utm_medium, utm_campaign, landing_path } = parseUTMs(body.page);

    const timezone =
      (body.payload?.timezone as string) ||
      (body.payload?.tz as string) ||
      null;

    const device_type =
      (body.payload?.device_type as string) ||
      deriveDeviceType(ua);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      db: { schema: 'public' },
    });

    // Ensure session exists (keep your original behavior)
    try {
      await supabase.rpc('touch_session', {
        p_session_id: body.session_id,
        p_user_agent: ua,
        p_ip_hash: ip_hash,
      });
    } catch {
      // ignore
    }

    // Upsert enriched session fields (THIS is what your listen_session trigger will copy from)
    try {
      const { error: upsertErr } = await supabase
        .from('sessions')
        .upsert(
          {
            session_id: body.session_id,
            user_agent: ua,
            ip_hash,

            country,
            region,
            city,
            timezone,
            landing_path,
            utm_source,
            utm_medium,
            utm_campaign,
            referrer: body.referrer?.slice(0, 512) ?? null,
            language,
            device_type,
          },
          { onConflict: 'session_id' }
        );

      if (upsertErr && !upsertErr.message?.includes('schema cache')) {
        console.warn('sessions upsert error:', upsertErr.message);
      }
    } catch {
      // ignore
    }

    // Insert event
    try {
      const row: any = {
        session_id: body.session_id,
        event_type: body.event_type,
        page: body.page?.slice(0, 512) ?? null,
        referrer: body.referrer?.slice(0, 512) ?? null,
        song_slug: body.song_slug?.slice(0, 128) ?? null,
        payload: body.payload ?? null,
      };

      const { error } = await supabase.from('events').insert(row);
      if (error && !error.message?.includes('schema cache')) {
        console.warn('events insert error:', error);
      }
    } catch {
      // ignore
    }

    return j(204);
  } catch (e: any) {
    console.error('/api/track unexpected error:', e);
    return j(500, { error: e?.message || 'Unexpected server error' });
  }
}
