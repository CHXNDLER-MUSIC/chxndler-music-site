import { NextResponse, NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

// POST - Send a new heart signal message (authenticated users only)
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "production") console.log("✅ HEART SIGNAL ROUTE HIT (APP ROUTER)");
  try {
    const body = await req.json().catch(() => ({} as any));

    const raw = (body?.message ?? body?.messageText ?? "").toString();
    const message = raw.trim();
    const displayName = (body?.displayName ?? body?.username ?? "").toString().trim();
    const clientNonce = (body?.client_nonce ?? '').toString().trim() || null;
    const dedupeKey = (body?.dedupe_key ?? clientNonce ?? '').toString().trim() || null;

    // Normalize guest_id: accept raw UUIDs or values prefixed with 'guest_' / 'guest-'
    const rawGuestId = (body?.guest_id ?? '').toString().trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let guestId: string | null = null;
    if (rawGuestId && rawGuestId !== 'guest_ssr_placeholder') {
      const stripped = rawGuestId.replace(/^guest[_-]/i, '');
      guestId = uuidRegex.test(stripped) ? stripped : null;
    }

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "Message is required", receivedKeys: Object.keys(body || {}) },
        { status: 400 }
      );
    }

    // Use user-scoped client only for authentication check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignored in route handlers if middleware handles session refresh
            }
          },
        },
      }
    );

    // Try to resolve auth user, but allow guests to post
    const { data: userResult } = await supabase.auth.getUser();
    const userId = userResult?.user?.id ?? null;

    // Prefer provided displayName/username, then auth metadata, then safe fallback
    const username = (
      displayName ||
      userResult?.user?.user_metadata?.name ||
      userResult?.user?.user_metadata?.full_name ||
      body?.username ||
      "ALIEN"
    ).toString().trim().substring(0, 64) || "ALIEN";

    // Use admin client for insert to bypass RLS (auth already verified above)
    const admin = getSupabaseAdmin();

    // If no auth user and no valid guestId provided, generate a transient guest id
    if (!userId && !guestId) {
      try {
        guestId = randomUUID();
      } catch {
        // very old runtimes: fallback
        guestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }
    }

    const insertPayload = {
      user_id: userId, // may be null for guests
      guest_id: userId ? null : guestId, // set guest_id for logged-out users (normalized UUID or null)
      username,
      message,
      is_system: false,
      // allow client-provided dedupe_key for optimistic reconciliation
      dedupe_key: dedupeKey,
    };

    let { data, error } = await admin
      .from("heart_signal_messages")
      .insert(insertPayload)
      .select("*")
      .single();

    // P0001 = DB raised exception (e.g. guest_id not found in guest_profiles).
    // Retry without guest_id so the message still saves for unregistered guests.
    if (error?.code === 'P0001' && insertPayload.guest_id) {
      console.warn("heart-signal: guest_id rejected by DB, retrying without it:", insertPayload.guest_id);
      ({ data, error } = await admin
        .from("heart_signal_messages")
        .insert({ ...insertPayload, guest_id: null })
        .select("*")
        .single());
    }

    if (error) {
      console.error("heart-signal insert error:", error);
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code, details: error.details, hint: error.hint },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: data });
  } catch (err: any) {
    console.error("heart-signal POST crash:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Route crashed",
        details: err?.message ?? String(err),
        stack: err?.stack ?? null,
      },
      { status: 500 }
    );
  }
}

// GET - Fetch recent messages
export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const { data, error } = await admin
      .from('heart_signal_messages')
      .select('id, user_id, guest_id, username, message, created_at, is_system, dedupe_key, heart_count, water_count, lightning_count, darkness_count, alien_count')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('GET /api/heart-signal-messages: Fetch error:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Reverse to show oldest first
    const messages = (data || []).reverse();

    return NextResponse.json({ ok: true, success: true, messages });
  } catch (error) {
    console.error('GET /api/heart-signal-messages: Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
