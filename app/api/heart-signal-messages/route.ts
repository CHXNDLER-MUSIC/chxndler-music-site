import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

// POST - Send a new heart signal message (authenticated users only)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create authenticated route handler client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Authenticate the user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Use admin client for profile lookup (bypasses RLS)
    const admin = getSupabaseAdmin();

    // Derive username: profiles.name → user_metadata.name → full_name → "CHXNDLER"
    const { data: profile } = await admin
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    const username =
      profile?.name ||
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      'CHXNDLER';

    // Insert using authenticated client so RLS matches auth.uid()
    const { data, error } = await supabase
      .from('heart_signal_messages')
      .insert({
        user_id: user.id,
        username,
        message: message.trim(),
        is_system: false,
      })
      .select('id, user_id, username, message, created_at, is_system')
      .single();

    if (error) {
      console.error('POST /api/heart-signal-messages: Insert error:', error);
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: data });
  } catch (error) {
    console.error('POST /api/heart-signal-messages: Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
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
      .select('id, user_id, username, message, created_at, is_system, heart_count, water_count, lightning_count, darkness_count, alien_count')
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
