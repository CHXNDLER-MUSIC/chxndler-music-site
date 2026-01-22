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

  page?: string;
  referrer?: string;
  song_slug?: string;
  payload?: Record<string, any>;
  user_agent?: string;

  // optional client context (recommended to send from frontend)
  timezone?: string;
  language?: string;
  landing_path?: string;

  // optional UTM fields (recommended)
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;

  // optional device type if you want to send it (e.g., 'mobile'/'desktop')
  device_type?: string;
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

    // Ensure session row exists: try RPC first, then direct upsert fallback
    let sessionEnsured = false;
    try {
      const { error: rpcError } = await supabase.rpc('touch_session', {
        p_session_id: body.session_id,
        p_user_agent: ua,
        p_ip_hash: ip_hash,
      });
      if (!rpcError) sessionEnsured = true;
      else if (!rpcError.message?.includes('schema cache')) {
        console.warn('touch_session error:', rpcError.message);
      }
    } catch {
      // Suppress RPC errors
    }

    if (!sessionEnsured) {
      try {
        // Fallback: upsert directly into analytics.sessions to satisfy FK
        const { error: upsertErr } = await supabase
          .from('sessions')
          .upsert(
            { session_id: body.session_id, user_agent: ua, ip_hash },
            { onConflict: 'session_id', ignoreDuplicates: false }
          );
        if (upsertErr && !upsertErr.message?.includes('schema cache')) {
          console.warn('sessions upsert error:', upsertErr.message);
        } else {
          sessionEnsured = true;
        }
      } catch {
        // Ignore – analytics should never block
      }
    }

    // Insert event into analytics.events table (existing behavior)
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
      // Suppress schema cache errors to reduce log noise
    }

    // ------------------------------------------------------------------------
    // NEW: Write listen-session rows with server-side Geo (Vercel headers)
    // This is what fills country/region/city reliably.
    // ------------------------------------------------------------------------

    // Geo from Vercel (only present on Vercel prod/preview; may be null locally)
    const country = req.headers.get('x-vercel-ip-country');
    const region = req.headers.get('x-vercel-ip-country-region');
    const city = req.headers.get('x-vercel-ip-city');

    // Optional client context (frontend should send these)
    const timezone = body.timezone ?? null;
    const language = body.language ?? null;
    const landing_path = body.landing_path ?? null;

    // Optional UTMs (frontend should send these)
    const utm_source = body.utm_source ?? null;
    const utm_medium = body.utm_medium ?? null;
    const utm_campaign = body.utm_campaign ?? null;
    const utm_content = body.utm_content ?? null;
    const utm_term = body.utm_term ?? null;

    // Optional device type (frontend can send)
    const device_type = body.device_type ?? null;

    // Only insert if this event is the listen-session event and has payload
    // IMPORTANT: payload must include song_uuid + started_at at minimum.
    if (body.event_type === 'song_listen_session' && body.payload) {
      const p = body.payload;

      const song_uuid = p.song_uuid ?? null;
      const started_at = p.started_at ?? null;

      if (song_uuid && started_at) {
        try {
          const { error } = await supabase
            .from('anonymous_song_listen_sessions')
            .insert({
              anon_session_id: body.session_id,

              song_uuid,
              song_title: p.song_title ?? null,
              started_at,
              ended_at: p.ended_at ?? null,
              listened_seconds: p.listened_seconds ?? null,
              duration_seconds: p.duration_seconds ?? null,
              source: p.source ?? 'web',

              // geo + context
              country: country ?? null,
              region: region ?? null,
              city: city ?? null,
              timezone,
              language,
              referrer: body.referrer?.slice(0, 512) ?? null,
              landing_path: landing_path?.slice(0, 512) ?? null,

              // utms
              utm_source,
              utm_medium,
              utm_campaign,
              utm_content,
              utm_term,

              // device
              device_type,

              // keep extra stuff in metadata jsonb
              metadata: {
                user_agent: ua,
                ip_hash,
              },
            });

          if (error && !error.message?.includes('schema cache')) {
            console.warn('anonymous_song_listen_sessions insert error:', error.message);
          }
        } catch (e: any) {
          console.warn('anonymous_song_listen_sessions insert exception:', e?.message);
        }
      }
    }

    // Success: no content needed
    return j(204);
  } catch (e: any) {
    console.error('/api/track unexpected error:', e);
    return j(500, { error: e?.message || 'Unexpected server error' });
  }
}
