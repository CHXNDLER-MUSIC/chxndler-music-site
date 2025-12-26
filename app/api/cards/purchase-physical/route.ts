import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

/**
 * Extract access token from Supabase auth cookies
 * Supabase uses project-prefixed cookie names like sb-{ref}-auth-token
 */
function extractAccessToken(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
  const allCookies = cookieStore.getAll();

  // Look for any cookie that matches Supabase auth pattern
  for (const cookie of allCookies) {
    if (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) {
      try {
        const parsed = JSON.parse(cookie.value);
        if (parsed?.access_token) {
          return parsed.access_token;
        }
      } catch {
        // Not valid JSON, skip
      }
    }
  }

  // Fallback: look for raw sb-access-token (legacy/simple setup)
  const legacyToken = cookieStore.get('sb-access-token')?.value;
  if (legacyToken) {
    return legacyToken;
  }

  return null;
}

export async function POST(req: NextRequest) {
  console.log('[purchase-physical] POST request received');

  try {
    // 1. Extract auth token from cookies
    const cookieStore = await cookies();
    const token = extractAccessToken(cookieStore);

    if (!token) {
      console.log('[purchase-physical] No auth token found');
      return NextResponse.json(
        { ok: false, error: 'Not authenticated - please log in' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let cardId: string;
    try {
      const body = await req.json();
      cardId = body.cardId;
    } catch {
      console.log('[purchase-physical] Invalid JSON body');
      return NextResponse.json(
        { ok: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!cardId) {
      console.log('[purchase-physical] Missing cardId');
      return NextResponse.json(
        { ok: false, error: 'Missing required field: cardId' },
        { status: 400 }
      );
    }

    console.log('[purchase-physical] Processing purchase for cardId:', cardId);

    // 3. Create Supabase client with user's JWT (RLS-aware)
    const supabase = createSupabaseServerClientWithJwt(token);

    // 4. Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.log('[purchase-physical] Invalid auth token:', authError?.message);
      return NextResponse.json(
        { ok: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    console.log('[purchase-physical] User authenticated:', user.id);

    // 5. Call the RPC to perform atomic purchase
    const { data: orderId, error: rpcError } = await supabase.rpc('purchase_physical_card', {
      p_card_id: cardId,
    });

    if (rpcError) {
      console.error('[purchase-physical] RPC error:', rpcError.message);

      // Parse known error types from RPC
      const errorMsg = rpcError.message || 'Purchase failed';
      let userMessage = 'Purchase failed';

      if (errorMsg.includes('INSUFFICIENT_FUNDS')) {
        userMessage = 'Insufficient HeartCoins for this purchase';
      } else if (errorMsg.includes('ITEM_NOT_FOUND')) {
        userMessage = 'Card not found or not available for physical purchase';
      } else if (errorMsg.includes('UNAUTHORIZED')) {
        userMessage = 'Please log in to make a purchase';
      } else if (errorMsg.includes('USER_NOT_FOUND')) {
        userMessage = 'User profile not found';
      } else {
        userMessage = errorMsg;
      }

      return NextResponse.json(
        { ok: false, error: userMessage, details: rpcError.message },
        { status: 400 }
      );
    }

    // 6. Fetch the updated balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('heartcoin_balance')
      .eq('id', user.id)
      .single();

    const newBalance = profile?.heartcoin_balance ?? undefined;

    console.log('[purchase-physical] SUCCESS order_id:', orderId, 'new_balance:', newBalance);

    // 7. Return success response
    return NextResponse.json({
      ok: true,
      order_id: orderId,
      new_balance: newBalance,
    });

  } catch (error) {
    console.error('[purchase-physical] Unexpected error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/cards/purchase-physical',
    methods: ['POST'],
  });
}
