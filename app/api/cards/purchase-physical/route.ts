import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

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
    // 1. Parse request body
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

    // 2. Extract access token from Supabase auth cookies
    const cookieStore = await cookies();
    const accessToken = extractAccessToken(cookieStore);

    if (!accessToken) {
      console.log('[purchase-physical] No auth token found');
      return NextResponse.json(
        { ok: false, error: 'Not authenticated - please log in' },
        { status: 401 }
      );
    }

    console.log('[purchase-physical] Processing purchase for cardId:', cardId);

    // 3. Create Supabase client with anon key and user's access token in Authorization header
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[purchase-physical] Missing Supabase environment variables');
      return NextResponse.json(
        { ok: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // 4. Call the RPC to perform atomic purchase (auth.uid() is set via the JWT)
    const { data, error: rpcError } = await supabase.rpc('purchase_physical_card', {
      p_card_id: cardId,
    });

    if (rpcError) {
      console.error('[purchase-physical] RPC error:', rpcError.message);

      // Parse known error types from RPC
      const errorMsg = rpcError.message || 'Purchase failed';
      let userMessage = 'Purchase failed';
      let statusCode = 400;

      if (errorMsg.includes('INSUFFICIENT_FUNDS')) {
        userMessage = 'Insufficient HeartCoins for this purchase';
      } else if (errorMsg.includes('ITEM_NOT_FOUND')) {
        userMessage = 'Card not found or not available for physical purchase';
      } else if (errorMsg.includes('UNAUTHORIZED') || errorMsg.includes('JWT')) {
        userMessage = 'Please log in to make a purchase';
        statusCode = 401;
      } else if (errorMsg.includes('USER_NOT_FOUND')) {
        userMessage = 'User profile not found';
      } else {
        userMessage = errorMsg;
      }

      return NextResponse.json(
        { ok: false, error: userMessage },
        { status: statusCode }
      );
    }

    // 5. Return success response
    // The RPC should return order_id and new_balance (or adjust based on your function's return type)
    const orderId = data?.order_id ?? data;
    const newBalance = data?.new_balance ?? undefined;

    console.log('[purchase-physical] SUCCESS order_id:', orderId, 'new_balance:', newBalance);

    return NextResponse.json({
      ok: true,
      order_id: orderId,
      new_balance: newBalance,
    });

  } catch (error) {
    console.error('[purchase-physical] Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
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
