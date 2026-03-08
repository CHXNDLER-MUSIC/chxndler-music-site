import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

// POST - Send a new heart signal message
// Authenticated users → heart_signal_messages
// Logged-out/guest users → heart_signal_guest_messages
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "production") console.log("✅ HEART SIGNAL ROUTE HIT (APP ROUTER)");
  try {
    const body = await req.json().catch(() => ({} as any));

    const raw = (body?.message ?? body?.messageText ?? "").toString();
    const message = raw.trim();
    const displayName = (body?.displayName ?? body?.username ?? "").toString().trim();

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

    // Try to resolve auth user
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

    // Try to get an admin client for privileged writes if available.
    let admin: ReturnType<typeof getSupabaseAdmin> | null = null;
    try {
      admin = getSupabaseAdmin();
    } catch {
      admin = null;
    }

    const isSystem = Boolean(body?.is_system);
    const clientNonce = (body?.client_nonce ?? '').toString().trim() || null;
    const dedupeKey = (body?.dedupe_key ?? clientNonce ?? '').toString().trim() || null;

    let data: any = null;
    let error: any = null;

    if (userId) {
      // ── Authenticated user → heart_signal_messages ──
      const insertPayload: any = {
        username,
        message,
        is_system: isSystem,
        dedupe_key: dedupeKey,
        user_id: userId,
        guest_id: null,
        sender_user_id: userId,
        sender_guest_id: null,
      };

      if (process.env.NODE_ENV !== 'production') {
        console.log('[heart-signal] Auth insert payload:', { username, isSystem, userId });
      }

      if (admin) {
        ({ data, error } = await admin
          .from("heart_signal_messages")
          .insert(insertPayload)
          .select("*")
          .single());
      } else {
        ({ data, error } = await supabase
          .from('heart_signal_messages')
          .insert(insertPayload)
          .select('*')
          .single());
      }

      if (error) {
        console.error("[heart-signal] Auth insert error:", error);
        return NextResponse.json(
          { ok: false, error: error.message, code: error.code, details: error.details, hint: error.hint },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, message: { ...data, source: 'auth' } });
    } else {
      // ── Guest / logged-out user → heart_signal_guest_messages ──
      // Only send username, message, is_system — no sender identity columns needed
      const guestPayload = {
        username: username.trim() || 'ALIEN',
        message,
        is_system: isSystem,
      };

      if (process.env.NODE_ENV !== 'production') {
        console.log('[heart-signal] Guest insert payload:', guestPayload);
      }

      if (admin) {
        ({ data, error } = await admin
          .from("heart_signal_guest_messages")
          .insert(guestPayload)
          .select("*")
          .single());
      } else {
        ({ data, error } = await supabase
          .from('heart_signal_guest_messages')
          .insert(guestPayload)
          .select('*')
          .single());
      }

      if (error) {
        console.error("[heart-signal] Guest insert error:", error);
        return NextResponse.json(
          { ok: false, error: error.message, code: error.code, details: error.details, hint: error.hint },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, message: { ...data, source: 'guest' } });
    }
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

// GET - Fetch recent messages from the combined public view
// Returns messages from both heart_signal_messages (auth) and heart_signal_guest_messages (guest)
export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const { data, error } = await admin
      .from('heart_signal_messages_public')
      .select('id, username, message, created_at, is_system, source')
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
