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
    // Extract variant selection (optional)
    const selectedVariant = body?.selected_variant || null;
    const selectedColor = body?.selected_color || null;
    console.log('[API /api/merch/purchase] selectedColor:', selectedColor);
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
      selectedVariant,
      selectedColor,
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

    // DEBUG: Log all cookies received
    const allCookies = cookieStore.getAll();
    console.log('[MERCH PURCHASE DEBUG] Cookie names:', allCookies.map(c => c.name));
    console.log('[MERCH PURCHASE DEBUG] sb-* cookies:', allCookies.filter(c => c.name.startsWith('sb-')).map(c => ({ name: c.name, valueLen: c.value?.length })));

    const token = cookieStore.get('sb-access-token')?.value || '';
    console.log('[MERCH PURCHASE DEBUG] sb-access-token found:', !!token, 'length:', token?.length || 0);

    if (!token) {
      console.log('[MERCH PURCHASE DEBUG] No sb-access-token cookie - returning 401');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[MERCH PURCHASE DEBUG] supabase.auth.getUser() result:', {
      hasUser: !!user,
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      error: authError?.message ?? null,
    });

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // ============================================================
    // CALL RPC: purchase_merch_with_heartcoins_v4
    // Signature: (p_merch_item_id uuid, p_quantity int, p_client_request_id uuid, p_selected_variant jsonb, p_selected_color text)
    // v4 uses auth.uid() internally, order_type defaults to 'merch'
    // Variant data is included in the RPC INSERT directly (SECURITY DEFINER bypasses RLS)
    // ============================================================
    const rpcParams = {
      p_merch_item_id: merchItemId,
      p_quantity: quantity,
      p_client_request_id: idempotencyKey,
      p_selected_variant: selectedVariant && Object.keys(selectedVariant).length > 0 ? selectedVariant : {},
      p_selected_color: selectedColor || null,
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

    // Variant data is now included in the RPC INSERT directly (no separate UPDATE needed)
    console.log('[PURCHASE] Variant data passed to RPC:', { selectedVariant, selectedColor });

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
      console.log('[PURCHASE] Success:', result, { selectedVariant, selectedColor });
      return NextResponse.json({
        success: true,
        order_id: ordersId,
        amount_spent: result.amount_spent || result.total_heartcoins || 0,
        payment_type: normalizedPaymentType,
        variant_saved: selectedVariant,
        color_saved: selectedColor,
      });
    }

    // RPC returned but without success flag - return what we got
    console.log('[PURCHASE] RPC returned:', result, { selectedVariant, selectedColor });
    return NextResponse.json({
      success: true,
      order_id: ordersId,
      amount_spent: result?.amount_spent || result?.total_heartcoins || 0,
      variant_saved: selectedVariant,
      color_saved: selectedColor,
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
