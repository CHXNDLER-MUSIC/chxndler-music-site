import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt, getSupabaseAdmin } from '@/lib/supabaseServer';

// Generate ALIEN###### username for anonymous guests
function generateAlienUsername(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `ALIEN${randomNum}`;
}

// POST - Send a new heart signal message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, is_system, username: providedUsername, client_nonce } = body;

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.error('POST /api/heart-signal-messages: Empty or invalid message');
      return NextResponse.json(
        { ok: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // Get auth token to check if user is authenticated
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';

    // Try to get authenticated user
    let userId: string | null = null;
    let derivedUsername: string | null = null;

    if (token) {
      try {
        const supabase = createSupabaseServerClientWithJwt(token);
        const { data: userResult, error: userError } = await supabase.auth.getUser();

        if (!userError && userResult?.user) {
          userId = userResult.user.id;

          // Get username from profile or user_metadata
          const { data: profile } = await admin
            .from('profiles')
            .select('name')
            .eq('id', userId)
            .single();

          derivedUsername = profile?.name ||
            userResult.user.user_metadata?.name ||
            userResult.user.user_metadata?.full_name ||
            'CHXNDLER';
        }
      } catch (authError) {
        console.error('POST /api/heart-signal-messages: Auth error:', authError);
        // Continue as guest if auth fails
      }
    }

    // For system messages
    if (is_system) {
      // System messages require either an authenticated user or a provided username
      if (!userId && !providedUsername) {
        console.log('POST /api/heart-signal-messages: Skipping system message - no user or username');
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: 'No authenticated user or username for system message'
        });
      }

      const insertData: Record<string, unknown> = {
        message: message.trim(),
        is_system: true,
        user_id: userId, // null for guests
        username: userId ? (derivedUsername || 'SYSTEM') : (providedUsername || 'SYSTEM'),
      };

      const { data, error } = await admin
        .from('heart_signal_messages')
        .insert(insertData)
        .select('id, user_id, username, message, created_at, is_system')
        .single();

      if (error) {
        console.error('POST /api/heart-signal-messages: System message insert error:', error);
        return NextResponse.json(
          { ok: false, error: 'Failed to send system message' },
          { status: 500 }
        );
      }

      // Include client_nonce in response for optimistic UI matching (not stored in DB)
      const responseMessage = client_nonce ? { ...data, client_nonce } : data;
      return NextResponse.json({ ok: true, message: responseMessage });
    }

    // For regular messages
    // Determine username: authenticated user's profile name, or provided guest username, or generate ALIEN######
    let finalUsername: string;

    if (userId) {
      // Authenticated user - use profile name or fallback
      finalUsername = derivedUsername || providedUsername || 'CHXNDLER';
    } else {
      // Guest user - use provided username or generate ALIEN######
      if (providedUsername && typeof providedUsername === 'string' && providedUsername.trim().length > 0) {
        finalUsername = providedUsername.trim();
      } else {
        // Generate ALIEN###### for anonymous guests
        finalUsername = generateAlienUsername();
      }
    }

    // Build insert payload (client_nonce is NOT stored in DB, only returned in response)
    const insertPayload: Record<string, unknown> = {
      user_id: userId, // null for guests
      username: finalUsername,
      message: message.trim(),
      is_system: false,
    };

    const { data, error } = await admin
      .from('heart_signal_messages')
      .insert(insertPayload)
      .select('id, user_id, username, message, created_at, is_system')
      .single();

    if (error) {
      console.error('POST /api/heart-signal-messages: Insert error:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // Include client_nonce in response for optimistic UI matching (not stored in DB)
    const responseMessage = client_nonce ? { ...data, client_nonce } : data;

    return NextResponse.json({ ok: true, message: responseMessage });

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
