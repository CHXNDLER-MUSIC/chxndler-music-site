import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Defensive normalization for payment types
function normalizePaymentType(input: unknown): 'heartcoins' | 'stripe' {
  const v = String(input || '').trim().toLowerCase();
  if (v === 'heartcoins') return 'heartcoins';
  if (v === 'stripe') return 'stripe';
  // Default to heartcoins for this endpoint; throw for unexpected values in case of future misuse
  if (v && v !== 'usd' && v !== 'heartcoin' && v !== 'heart_coins' && v !== 'heart-coins') {
    throw new Error(`Invalid paymentType: ${v}. Allowed: heartcoins|stripe`);
  }
  return 'heartcoins';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // v4 only needs: merchItemId, quantity, idempotencyKey
    // Do NOT extract or send: order_type, clientSlug, userId - v4 handles these internally
    const { merchItemId, quantity = 1 } = body;
    // Accept both idempotencyKey and clientRequestId (backwards compatibility)
    const idempotencyKey: string | undefined = body?.idempotencyKey ?? body?.clientRequestId;
    // Normalize payment type to allowed values
    let normalizedPaymentType: 'heartcoins' | 'stripe';
    try {
      normalizedPaymentType = normalizePaymentType(body?.paymentType);
    } catch (e) {
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : 'Invalid paymentType' },
        { status: 400 }
      );
    }
    console.log('[PURCHASE] Incoming request:', {
      merchItemId,
      quantity,
      idempotencyKey,
      paymentType_normalized: normalizedPaymentType,
    });

    // Stripe not supported in this route
    if (normalizedPaymentType === 'stripe') {
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

    // ============================================================
    // CALL RPC: purchase_merch_with_heartcoins_v4
    // Signature: (p_merch_item_id uuid, p_quantity int, p_client_request_id uuid)
    // v4 uses auth.uid() internally, order_type defaults to 'merch'
    // Do NOT send: p_order_type, p_user_id, p_idempotency_key, p_client_slug
    // ============================================================
    const rpcParams = {
      p_merch_item_id: merchItemId,
      p_quantity: quantity,
      p_client_request_id: idempotencyKey,
    };
    console.log('[PURCHASE] RPC call: purchase_merch_with_heartcoins_v4', {
      ...rpcParams,
      expected_payment_type: normalizedPaymentType,
    });

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'purchase_merch_with_heartcoins_v4',
      rpcParams
    );

    console.log('[PURCHASE] RPC response:', { success: !rpcError, data: rpcResult, error: rpcError?.message, code: rpcError?.code });

    if (rpcError) {
      console.error('[PURCHASE] RPC error:', rpcError);
      if (rpcError.message?.includes('orders_payment_type_valid')) {
        console.error('[PURCHASE] Constraint failure indicates bad payment_type in DB insert. Expected "heartcoins".');
      }

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
        { success: false, error: rpcError.message || 'Purchase failed', errorCode: 'RPC_FAILED', payment_type_normalized: normalizedPaymentType },
        { status: 400 }
      );
    }

    // Handle RPC result - could be object or array
    const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;

    // Extract the orders.id from RPC result
    const ordersId = result?.order_id ? String(result.order_id) : null;
    console.log('[PURCHASE] orders.id', ordersId);

    // Treat "Already processed" as success (idempotency)
    if (result?.message === 'Already processed' || result?.idempotent) {
      console.log('[PURCHASE] Idempotent success:', result);
      return NextResponse.json({
        success: true,
        order_id: ordersId,
        amount_spent: result.amount_spent || result.total_heartcoins || 0,
        idempotent: true,
        payment_type: normalizedPaymentType,
      });
    }

    // Normal success
    if (result?.success) {
      console.log('[PURCHASE] Success:', result);
      return NextResponse.json({
        success: true,
        order_id: ordersId,
        amount_spent: result.amount_spent || result.total_heartcoins || 0,
        payment_type: normalizedPaymentType,
      });
    }

    // RPC returned but without success flag - return what we got
    console.log('[PURCHASE] RPC returned:', result);
    return NextResponse.json({
      success: true,
      order_id: ordersId,
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
