import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt, getSupabaseAdmin } from '@/lib/supabaseServer';

// POST - Send a new heart signal message
export async function POST(req: NextRequest) {
  try {
    const { message, is_system, username: providedUsername } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // For system messages, still need a valid user_id due to NOT NULL constraint
    // Get auth token to attribute system messages to the user who triggered them
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';

    if (is_system) {
      let systemUserId: string | null = null;

      // Try to get authenticated user for system messages
      if (token) {
        const supabase = createSupabaseServerClientWithJwt(token);
        const { data: userResult } = await supabase.auth.getUser();
        systemUserId = userResult?.user?.id || null;
      }

      // If no authenticated user, skip system message (can't insert without user_id)
      if (!systemUserId) {
        console.log('Skipping system message - no authenticated user');
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'No authenticated user for system message'
        });
      }

      const { data, error } = await admin
        .from('heart_signal_messages')
        .insert({
          user_id: systemUserId,
          username: providedUsername || 'SYSTEM',
          message: message.trim(),
          is_system: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending system message:', error);
        return NextResponse.json(
          { error: 'Failed to send system message' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data });
    }

    // For user messages, verify authentication (token already retrieved above)

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: userResult, error: userError } = await supabase.auth.getUser();

    if (userError || !userResult?.user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const user = userResult.user;

    // Get username from profile or use provided username
    let username = providedUsername;
    if (!username) {
      const { data: profile } = await admin
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      username = profile?.name || user.email || 'Anonymous';
    }

    // Insert message using admin client to bypass RLS
    const { data, error } = await admin
      .from('heart_signal_messages')
      .insert({
        user_id: user.id,
        username: username,
        message: message.trim(),
        is_system: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Heart signal message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Reverse to show oldest first
    const messages = (data || []).reverse();

    return NextResponse.json({ success: true, messages });

  } catch (error: any) {
    console.error('Heart signal messages fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
