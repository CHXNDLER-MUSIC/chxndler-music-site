import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

/**
 * Physical card purchase API
 * - Calls purchase_physical_card RPC which handles atomically:
 *   - Balance check and deduction
 *   - Order creation
 *   - Transaction logging
 * - Shipping info is added in step 2 via /api/cards/updateShipping
 */

const ROUTE_PATH = '/api/cards/purchase-physical';

// Generate a short random request ID for tracing
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Helper: Extract access token from Supabase auth cookies
// Supabase uses project-prefixed cookie names like sb-{ref}-auth-token
function extractAccessToken(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
  const allCookies = cookieStore.getAll();

  // Look for any cookie that matches Supabase auth pattern
  // Pattern: sb-{project-ref}-auth-token (stores JSON with access_token)
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

// Helper: Create a consistent error response with requestId
function errorResponse(
  requestId: string,
  message: string,
  code: string,
  status: number,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    { success: false, requestId, error: message, code, ...extra },
    { status }
  );
}

/**
 * GET handler - route health/debug check
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: ROUTE_PATH,
    methods: ['GET', 'POST'],
    ts: Date.now(),
  });
}

/**
 * OPTIONS handler - CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET,POST,OPTIONS',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * POST handler - physical card purchase
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const pathname = request.nextUrl.pathname;

  console.log(`[purchase-physical] START requestId=${requestId} method=POST pathname=${pathname}`);

  try {
    // Read cookies and extract auth token
    const cookieStore = await cookies();
    const token = extractAccessToken(cookieStore);

    if (!token) {
      console.log(`[purchase-physical] requestId=${requestId} error=not_authenticated`);
      return errorResponse(requestId, 'Not authenticated', 'AUTH_MISSING', 401);
    }

    // Parse request body
    let cardId: string | undefined;
    try {
      const body = await request.json();
      cardId = body.cardId;
    } catch {
      console.log(`[purchase-physical] requestId=${requestId} error=invalid_json`);
      return errorResponse(requestId, 'Invalid JSON body', 'INVALID_JSON', 400);
    }

    if (!cardId) {
      console.log(`[purchase-physical] requestId=${requestId} error=missing_card_id`);
      return errorResponse(requestId, 'Missing required field: cardId', 'MISSING_CARD_ID', 400);
    }

    // Create Supabase client with user's token so auth.uid() works in RPC
    const supabase = createSupabaseServerClientWithJwt(token);

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log(`[purchase-physical] requestId=${requestId} error=invalid_token`);
      return errorResponse(requestId, 'Invalid authentication token', 'AUTH_INVALID', 401);
    }

    // Fetch the card to get its physical price
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, card_name, price_heartcoins_physical, is_physical')
      .eq('id', cardId)
      .single();

    if (cardError || !card) {
      console.error(`[purchase-physical] requestId=${requestId} Card fetch error:`, cardError);
      return errorResponse(requestId, 'Card not found', 'CARD_NOT_FOUND', 404);
    }

    if (!card.is_physical) {
      console.log(`[purchase-physical] requestId=${requestId} error=not_physical cardId=${cardId}`);
      return errorResponse(requestId, 'This card is not available for physical purchase', 'NOT_PHYSICAL', 400);
    }

    const cost = card.price_heartcoins_physical ?? 15;

    // Fetch user's current heartcoin_balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('heartcoin_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error(`[purchase-physical] requestId=${requestId} Profile fetch error:`, profileError);
      return errorResponse(requestId, 'User profile not found', 'PROFILE_NOT_FOUND', 404);
    }

    const currentBalance = profile.heartcoin_balance ?? 0;

    // Check if user has sufficient heartcoin_balance
    if (currentBalance < cost) {
      console.log(`[purchase-physical] requestId=${requestId} error=insufficient_balance required=${cost} available=${currentBalance}`);
      return errorResponse(
        requestId,
        `Insufficient HeartCoins! You need ${cost} but only have ${currentBalance}`,
        'INSUFFICIENT_BALANCE',
        400,
        { required: cost, available: currentBalance }
      );
    }

    // Call the RPC function to handle purchase atomically
    // RPC uses auth.uid() internally to identify the user
    const { data: orderId, error: rpcError } = await supabase.rpc('purchase_physical_card', {
      p_card_id: cardId,
    });

    if (rpcError) {
      console.error(`[purchase-physical] requestId=${requestId} RPC error:`, rpcError);
      return errorResponse(requestId, rpcError.message, 'RPC_ERROR', 400);
    }

    // Fetch actual new balance from database after RPC (more accurate than calculating)
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('heartcoin_balance')
      .eq('id', user.id)
      .single();

    const newBalance = updatedProfile?.heartcoin_balance ?? (currentBalance - cost);

    console.log(`[purchase-physical] SUCCESS requestId=${requestId} orderId=${orderId} cost=${cost} newBalance=${newBalance}`);

    // Return response with keys that match frontend expectations
    return NextResponse.json({
      success: true,
      requestId,
      orderId: orderId,
      newBalance: newBalance,
      new_balance: newBalance,
      heartcoin_balance: newBalance,
      cost: cost,
    });

  } catch (error) {
    console.error(`[purchase-physical] requestId=${requestId} Unexpected error:`, error);
    return errorResponse(
      requestId,
      `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'INTERNAL_ERROR',
      500
    );
  }
}
