import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Helper to log errors with full details
 */
function logError(context: string, error: any, extra?: Record<string, any>) {
  console.error(`[PURCHASE] ${context}:`, {
    message: error?.message || String(error),
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...extra,
  });
  if (error?.stack) {
    console.error(`[PURCHASE] ${context} stack:`, error.stack);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Read request body exactly once at the top
    const body = await request.json();
    const {
      merchItemId,
      quantity = 1,
      idempotencyKey,
      paymentType,  // 'HEARTCOINS' | 'USD' | undefined
    } = body;

    // ============================================================
    // DETERMINE PAYMENT TYPE
    // HeartCoins purchase: has idempotencyKey OR paymentType === 'HEARTCOINS'
    // Stripe/USD purchase: paymentType === 'USD' (not implemented in this route)
    // ============================================================
    const isHeartCoinsPurchase = Boolean(idempotencyKey) || paymentType === 'HEARTCOINS';
    const isUsdPurchase = paymentType === 'USD';

    console.log('[PURCHASE] Incoming request:', {
      merchItemId,
      quantity,
      idempotencyKey: idempotencyKey || 'NONE',
      paymentType: paymentType || 'HEARTCOINS (inferred)',
      isHeartCoinsPurchase,
      isUsdPurchase,
    });

    // ============================================================
    // USD/STRIPE PATH - Not handled in this route
    // ============================================================
    if (isUsdPurchase) {
      console.log('[PURCHASE] USD payment requested - not supported in this route');
      return NextResponse.json(
        {
          success: false,
          error: 'USD payments are not supported in this endpoint. Use /api/checkout for Stripe payments.',
          errorCode: 'WRONG_ENDPOINT',
        },
        { status: 400 }
      );
    }

    // ============================================================
    // HEARTCOINS PURCHASE PATH
    // This route ONLY handles HeartCoins purchases - no Stripe involved
    // ============================================================

    // Validate merchItemId
    if (!merchItemId || typeof merchItemId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required field: merchItemId' },
        { status: 400 }
      );
    }

    // Validate idempotencyKey for HeartCoins purchases
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      console.error('[PURCHASE] Missing idempotencyKey for HeartCoins purchase');
      return NextResponse.json(
        { success: false, error: 'Missing required field: idempotencyKey' },
        { status: 400 }
      );
    }

    if (!UUID_REGEX.test(idempotencyKey)) {
      console.error('[PURCHASE] Invalid idempotencyKey format:', idempotencyKey);
      return NextResponse.json(
        { success: false, error: 'Invalid idempotencyKey: must be a valid UUID' },
        { status: 400 }
      );
    }

    // Validate quantity
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized - no session token' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      logError('Auth error', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found in session' },
        { status: 401 }
      );
    }

    // Map idempotencyKey -> client_request_id
    const client_request_id = idempotencyKey;

    console.log('[PURCHASE] HeartCoins purchase - attempting:', {
      merch_item_id: merchItemId,
      client_request_id,
      quantity,
      user_id: user.id,
    });

    // ============================================================
    // TRY RPC FIRST (atomic, preferred)
    // ============================================================
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'purchase_merch_with_heartcoins_v3',
      {
        p_merch_item_id: merchItemId,
        p_client_request_id: client_request_id,
        p_quantity: quantity,
      }
    );

    console.log('[PURCHASE] RPC response:', {
      hasResult: !!rpcResult,
      rpcError: rpcError?.message,
      rpcCode: rpcError?.code,
    });

    // If RPC succeeded, return the result
    if (!rpcError && rpcResult) {
      let orderId: string | null = null;
      let amountSpent: number = 0;

      if (typeof rpcResult === 'object') {
        orderId = rpcResult.order_id ? String(rpcResult.order_id) : null;
        amountSpent = rpcResult.amount_spent || rpcResult.total_heartcoins || 0;
      } else if (typeof rpcResult === 'string') {
        orderId = rpcResult;
      }

      console.log(`[PURCHASE] RPC Success - Order ${orderId} for user ${user.id}`);

      return NextResponse.json({
        success: true,
        order_id: orderId,
        user_id: user.id,
        amount_spent: amountSpent,
      });
    }

    // Check if we should fall back to manual logic
    const shouldFallback =
      rpcError?.message?.includes('Could not find the function') ||
      rpcError?.message?.includes('does not exist') ||
      rpcError?.message?.includes('schema cache') ||
      rpcError?.message?.includes('column') ||
      rpcError?.code === '42883' ||  // undefined_function
      rpcError?.code === '42703';    // undefined_column

    if (!shouldFallback && rpcError) {
      // RPC exists but returned a business logic error
      logError('RPC business error', rpcError);

      // Check for duplicate (idempotent success)
      if (
        rpcError.message?.includes('duplicate key') ||
        rpcError.message?.includes('unique constraint') ||
        rpcError.code === '23505'
      ) {
        console.log('[PURCHASE] Duplicate request - fetching existing order');

        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id, total_heartcoins')
          .eq('client_request_id', client_request_id)
          .single();

        if (existingOrder) {
          return NextResponse.json({
            success: true,
            order_id: String(existingOrder.id),
            user_id: user.id,
            amount_spent: existingOrder.total_heartcoins || 0,
            idempotent: true,
          });
        }

        return NextResponse.json({
          success: true,
          order_id: null,
          user_id: user.id,
          amount_spent: 0,
          idempotent: true,
          warning: 'Duplicate request, order may be in progress',
        });
      }

      // Handle specific RPC error types
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
          { success: false, error: 'Item not found or unavailable.', errorCode: 'ITEM_NOT_FOUND' },
          { status: 404 }
        );
      }

      if (rpcError.message?.includes('USER_NOT_FOUND')) {
        return NextResponse.json(
          { success: false, error: 'User profile not found.', errorCode: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      // Return the actual RPC error for debugging
      return NextResponse.json(
        {
          success: false,
          error: `RPC error: ${rpcError.message || 'Unknown error'}`,
          errorCode: 'RPC_FAILED',
          details: rpcError.code,
        },
        { status: 400 }
      );
    }

    // ============================================================
    // FALLBACK: Manual HeartCoins purchase logic
    // Used when RPC doesn't exist or has schema errors
    // ============================================================
    console.log('[PURCHASE] Using manual fallback for HeartCoins purchase');

    // 1. Check for existing order (idempotency)
    const { data: existingOrder, error: existingError } = await supabase
      .from('orders')
      .select('id, total_heartcoins')
      .eq('client_request_id', client_request_id)
      .maybeSingle();

    if (existingError) {
      logError('Error checking existing order', existingError);
    }

    if (existingOrder) {
      console.log('[PURCHASE] Idempotent: Order already exists:', existingOrder.id);
      return NextResponse.json({
        success: true,
        order_id: String(existingOrder.id),
        user_id: user.id,
        amount_spent: existingOrder.total_heartcoins || 0,
        idempotent: true,
      });
    }

    // 2. Fetch merch item details
    // IMPORTANT: merch_items has `name`, NOT `item_name`
    const { data: merchItem, error: merchError } = await supabase
      .from('merch_items')
      .select('id, name, price_heartcoins, is_active')
      .eq('id', merchItemId)
      .single();

    if (merchError) {
      logError('Merch item lookup failed', merchError, { merchItemId });
      return NextResponse.json(
        {
          success: false,
          error: `Item lookup failed: ${merchError.message}`,
          errorCode: 'ITEM_LOOKUP_FAILED',
        },
        { status: 404 }
      );
    }

    if (!merchItem) {
      return NextResponse.json(
        { success: false, error: 'Item not found.', errorCode: 'ITEM_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!merchItem.is_active) {
      return NextResponse.json(
        { success: false, error: 'Item is no longer available.', errorCode: 'ITEM_NOT_AVAILABLE' },
        { status: 400 }
      );
    }

    // 3. Fetch user's current HeartCoin balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('heartcoin_balance')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logError('Profile lookup failed', profileError, { userId: user.id });
      return NextResponse.json(
        {
          success: false,
          error: `Profile lookup failed: ${profileError.message}`,
          errorCode: 'PROFILE_LOOKUP_FAILED',
        },
        { status: 404 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found.', errorCode: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const unitPrice = merchItem.price_heartcoins || 0;
    const totalCost = unitPrice * quantity;
    const currentBalance = profile.heartcoin_balance || 0;

    console.log('[PURCHASE] Balance check:', { currentBalance, totalCost, unitPrice, quantity });

    if (currentBalance < totalCost) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient HeartCoins. You have ${currentBalance}, need ${totalCost}.`,
          errorCode: 'INSUFFICIENT_HEARTCOINS',
        },
        { status: 400 }
      );
    }

    // 4. Deduct HeartCoins from profile
    const newBalance = currentBalance - totalCost;
    console.log('[PURCHASE] Deducting HeartCoins:', { from: currentBalance, to: newBalance });

    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ heartcoin_balance: newBalance })
      .eq('id', user.id)
      .select('heartcoin_balance')
      .single();

    if (updateError) {
      logError('Failed to deduct HeartCoins', updateError, {
        userId: user.id,
        currentBalance,
        newBalance,
        totalCost,
      });
      return NextResponse.json(
        {
          success: false,
          error: `HeartCoin deduction failed: ${updateError.message}`,
          errorCode: 'BALANCE_UPDATE_FAILED',
          details: updateError.code,
        },
        { status: 500 }
      );
    }

    console.log('[PURCHASE] HeartCoins deducted successfully:', updateData);

    // 5. Record HeartCoin transaction
    const { error: txError } = await supabase.from('heartcoin_transactions').insert({
      user_id: user.id,
      amount: -totalCost,
      reason: 'MERCH_PURCHASE',
      description: `Purchased: ${merchItem.name}`,
      transaction_type: 'purchase',
      client_request_id: client_request_id,
      metadata: {
        merch_item_id: merchItem.id,
        quantity,
        unit_price: unitPrice,
      },
    });

    if (txError) {
      logError('Transaction record failed (non-fatal)', txError);
      // Continue - order is more important
    }

    // 6. Create order record
    // MAPPING: merch_items.name -> orders.item_name
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        merch_item_id: merchItem.id,
        item_name: merchItem.name,  // <-- MAPPING: merch_items.name -> orders.item_name
        quantity: quantity,
        price_heartcoins: unitPrice,
        total_heartcoins: totalCost,
        client_request_id: client_request_id,
        status: 'pending_shipping',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, total_heartcoins')
      .single();

    if (orderError) {
      logError('Order creation failed', orderError, { merchItemId, userId: user.id });

      // Attempt to refund the HeartCoins
      console.log('[PURCHASE] Attempting refund due to order failure');
      const { error: refundError } = await supabase
        .from('profiles')
        .update({ heartcoin_balance: currentBalance })
        .eq('id', user.id);

      if (refundError) {
        logError('Refund failed', refundError);
      }

      return NextResponse.json(
        {
          success: false,
          error: `Order creation failed: ${orderError.message}`,
          errorCode: 'ORDER_CREATION_FAILED',
          details: orderError.code,
        },
        { status: 500 }
      );
    }

    console.log(`[PURCHASE] HeartCoins Success - Order ${order.id} for user ${user.id}`);

    return NextResponse.json({
      success: true,
      order_id: String(order.id),
      user_id: user.id,
      amount_spent: totalCost,
    });

  } catch (error) {
    logError('Unexpected error', error);
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
