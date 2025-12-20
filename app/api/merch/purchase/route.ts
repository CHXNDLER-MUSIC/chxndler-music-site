import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchItemId, quantity = 1, idempotencyKey, paymentType } = body;

    // Normalize order_type defensively - accept multiple field names
    const VALID_ORDER_TYPES = ['merch', 'physical_card'] as const;
    type ValidOrderType = typeof VALID_ORDER_TYPES[number];

    const rawOrderType = body.order_type ?? body.orderType ?? body.type ?? 'merch';

    // Guard: if caller explicitly passed an invalid type, reject the request
    if (rawOrderType && !VALID_ORDER_TYPES.includes(rawOrderType)) {
      return NextResponse.json(
        { success: false, error: `Invalid order_type: "${rawOrderType}". Must be 'merch' or 'physical_card'.`, errorCode: 'INVALID_ORDER_TYPE' },
        { status: 400 }
      );
    }

    const order_type: ValidOrderType = VALID_ORDER_TYPES.includes(rawOrderType)
      ? rawOrderType
      : 'merch';

    console.log('[PURCHASE] Incoming request:', { merchItemId, quantity, idempotencyKey, order_type });

    // USD not supported in this route
    if (paymentType === 'USD') {
      return NextResponse.json(
        { success: false, error: 'Use /api/checkout for Stripe payments.', errorCode: 'WRONG_ENDPOINT' },
        { status: 400 }
      );
    }

    // Validate inputs
    if (!merchItemId || typeof merchItemId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required field: merchItemId' },
        { status: 400 }
      );
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string' || !UUID_REGEX.test(idempotencyKey)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid idempotencyKey (must be UUID)' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a positive integer' },
        { status: 400 }
      );
    }

    // Get user from session
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    console.log('[PURCHASE] Calling RPC purchase_merch_with_heartcoins_v4:', {
      p_merch_item_id: merchItemId,
      p_quantity: quantity,
      p_client_request_id: idempotencyKey,
      p_order_type: order_type,
    });

    // ============================================================
    // CALL RPC - Let the database handle everything atomically
    // Do NOT write to heartcoin balance or orders manually
    // ============================================================
    console.log('[PURCHASE] inserting order_type:', order_type);
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'purchase_merch_with_heartcoins_v4',
      {
        p_merch_item_id: merchItemId,
        p_quantity: quantity,
        p_client_request_id: idempotencyKey,
        p_order_type: order_type,
      }
    );

    console.log('[PURCHASE] RPC response:', { rpcResult, rpcError: rpcError?.message });

    if (rpcError) {
      console.error('[PURCHASE] RPC error:', rpcError);

      // Parse known error messages
      if (rpcError.message?.includes('INSUFFICIENT_HEARTCOINS')) {
        const match = rpcError.message.match(/Have (\d+), need (\d+)/);
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient HeartCoins. You have ${match?.[1] || '?'}, need ${match?.[2] || '?'}.`,
            errorCode: 'INSUFFICIENT_HEARTCOINS',
          },
          { status: 400 }
        );
      }

      if (rpcError.message?.includes('ITEM_NOT_FOUND')) {
        return NextResponse.json(
          { success: false, error: 'Item not found.', errorCode: 'ITEM_NOT_FOUND' },
          { status: 404 }
        );
      }

      if (rpcError.message?.includes('USER_NOT_FOUND')) {
        return NextResponse.json(
          { success: false, error: 'User profile not found.', errorCode: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: rpcError.message || 'Purchase failed', errorCode: 'RPC_FAILED' },
        { status: 400 }
      );
    }

    // Handle RPC result - could be object or array
    const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;

    // Treat "Already processed" as success (idempotency)
    if (result?.message === 'Already processed' || result?.idempotent) {
      console.log('[PURCHASE] Idempotent success:', result);
      return NextResponse.json({
        success: true,
        order_id: result.order_id ? String(result.order_id) : null,
        amount_spent: result.amount_spent || result.total_heartcoins || 0,
        idempotent: true,
      });
    }

    // Normal success
    if (result?.success) {
      console.log('[PURCHASE] Success:', result);
      return NextResponse.json({
        success: true,
        order_id: result.order_id ? String(result.order_id) : null,
        amount_spent: result.amount_spent || result.total_heartcoins || 0,
      });
    }

    // RPC returned but without success flag - return what we got
    console.log('[PURCHASE] RPC returned:', result);
    return NextResponse.json({
      success: true,
      order_id: result?.order_id ? String(result.order_id) : null,
      amount_spent: result?.amount_spent || result?.total_heartcoins || 0,
      ...result,
    });

  } catch (error) {
    console.error('[PURCHASE] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
