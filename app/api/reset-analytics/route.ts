// app/api/reset-analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || '';
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

function j(status: number, data?: unknown) {
  return new NextResponse(data ? JSON.stringify(data) : null, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    },
  });
}

export function OPTIONS() { return j(204); }

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return j(500, { error: 'Supabase environment variables not set' });
    }

    // Basic protection: In production require admin secret; in dev allow freely
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      const key = req.headers.get('x-admin-key') || '';
      if (!ADMIN_SECRET || key !== ADMIN_SECRET) {
        return j(401, { error: 'Unauthorized' });
      }
    }

    // Public schema client (where events are actually stored)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      db: { schema: 'public' },
    });

    const results: Record<string, any> = {};

    // Delete all events from public schema (where track API stores them)
    try {
      const res = await supabase.from('events').delete().neq('event_type', '');
      if (res.error && !res.error.message?.includes('schema cache')) throw res.error;
      results.public_events = 'ok';
    } catch (e: any) {
      results.public_events = `error: ${e?.message || e}`;
    }

    // Also try analytics schema for any legacy data
    const supabaseAnalytics = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      db: { schema: 'analytics' },
    });
    
    try {
      const res = await supabaseAnalytics.from('events').delete().neq('event_type', '');
      if (res.error && !res.error.message?.includes('schema cache')) throw res.error;
      results.analytics_events = 'ok';
    } catch (e: any) {
      results.analytics_events = `error: ${e?.message || e}`;
    }

    // Try to clear legacy public tables if they exist
    const legacyTables = ['music_events', 'click_events', 'ab_test_events', 'user_flow_events'];
    for (const t of legacyTables) {
      try {
        const res = await supabase.from(t as any).delete().neq('id', '');
        if (res.error) {
          // Ignore relation-not-found errors
          const msg = String(res.error.message || '');
          if (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist')) {
            results[t] = 'not_found';
          } else {
            throw res.error;
          }
        } else {
          results[t] = 'ok';
        }
      } catch (e: any) {
        results[t] = `error: ${e?.message || e}`;
      }
    }

    return j(200, { success: true, results });
  } catch (e: any) {
    console.error('[reset-analytics] error:', e);
    return j(500, { error: e?.message || 'Failed to reset analytics' });
  }
}
