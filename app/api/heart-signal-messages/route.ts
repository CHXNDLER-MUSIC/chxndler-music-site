import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt, getSupabaseAdmin } from '@/lib/supabaseServer';

// POST - Send a new heart signal message
export async function POST(req: NextRequest) {
  try {
    const { message, is_system, username: providedUsername, guest_id } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // Get auth token to check if user is authenticated
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';

    // For system messages
    if (is_system) {
      let systemUserId: string | null = null;
      let systemGuestId: string | null = guest_id || null;

      // Try to get authenticated user for system messages
      if (token) {
        const supabase = createSupabaseServerClientWithJwt(token);
        const { data: userResult } = await supabase.auth.getUser();
        systemUserId = userResult?.user?.id || null;
      }

      // If no authenticated user and no guest_id, skip system message
      if (!systemUserId && !systemGuestId) {
        console.log('Skipping system message - no authenticated user or guest_id');
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'No authenticated user or guest_id for system message'
        });
      }

      // Build insert data - use user_id if authenticated, otherwise guest_id
      const insertData: Record<string, any> = {
        message: message.trim(),
        is_system: true
      };

      if (systemUserId) {
        insertData.user_id = systemUserId;
        insertData.username = providedUsername || 'SYSTEM';
      } else if (systemGuestId) {
        insertData.guest_id = systemGuestId;
        // DB trigger will fill username from guest_profiles
      }

      const { data, error } = await admin
        .from('heart_signal_messages')
        .insert(insertData)
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

    // For regular messages - check if authenticated user or guest
    let userId: string | null = null;

    if (token) {
      const supabase = createSupabaseServerClientWithJwt(token);
      const { data: userResult, error: userError } = await supabase.auth.getUser();

      if (!userError && userResult?.user) {
        userId = userResult.user.id;
      }
    }

    // If authenticated user, send with user_id
    if (userId) {
      // Get username from profile or use provided username
      let username = providedUsername;
      if (!username) {
        const { data: profile } = await admin
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single();
        username = profile?.name || 'Anonymous';
      }

      // Insert message using admin client to bypass RLS
      const { data, error } = await admin
        .from('heart_signal_messages')
        .insert({
          user_id: userId,
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
    }

    // For guest users - must have guest_id
    if (!guest_id) {
      return NextResponse.json(
        { error: 'Guest ID required for unauthenticated users' },
        { status: 400 }
      );
    }

    // Insert message with guest_id - DB trigger will fill username from guest_profiles
    const { data, error } = await admin
      .from('heart_signal_messages')
      .insert({
        guest_id: guest_id,
        message: message.trim(),
        is_system: false
        // DO NOT send username - DB trigger will fill it from guest_profiles
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending guest message:', error);
      return NextResponse.json(
        { error: 'Failed to send guest message' },
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
      .select('id, user_id, guest_id, username, message, created_at, is_system, heart_count, water_count, lightning_count, darkness_count, alien_count')
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
