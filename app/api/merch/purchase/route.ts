import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    // Read request body exactly once at the top
    const body = await request.json();
    const { merchItemId, quantity = 1, idempotencyKey } = body;

    // Log incoming request
    console.log('[PURCHASE] Incoming request:', {
      merchItemId,
      quantity,
      idempotencyKey: idempotencyKey || 'MISSING',
    });

    // Validate merchItemId
    if (!merchItemId || typeof merchItemId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required field: merchItemId' },
        { status: 400 }
      );
    }

    // Validate idempotencyKey is present and is a valid UUID
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      console.error('[PURCHASE] Missing idempotencyKey');
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
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Map idempotencyKey -> client_request_id
    const client_request_id = idempotencyKey;

    console.log('[PURCHASE] Attempting purchase:', {
      merch_item_id: merchItemId,
      client_request_id,
      quantity,
      user_id: user.id,
    });

    // Try the RPC function first (if it exists and works)
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'purchase_merch_with_heartcoins_v3',
      {
        p_merch_item_id: merchItemId,
        p_client_request_id: client_request_id,
        p_quantity: quantity,
      }
    );

    console.log('[PURCHASE] RPC response:', { rpcResult, rpcError: rpcError?.message });

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

      console.log(`[PURCHASE] RPC Success - Order ${orderId} created for user ${user.id}`);

      return NextResponse.json({
        success: true,
        order_id: orderId,
        user_id: user.id,
        amount_spent: amountSpent,
      });
    }

    // Check if we should fall back to manual logic
    // This includes: function not found, schema errors, column errors
    const shouldFallback =
      rpcError?.message?.includes('Could not find the function') ||
      rpcError?.message?.includes('does not exist') ||  // Catches both function and column errors
      rpcError?.message?.includes('schema cache') ||
      rpcError?.message?.includes('column') ||  // Any column-related error
      rpcError?.code === '42883' ||  // PostgreSQL "undefined_function"
      rpcError?.code === '42703';    // PostgreSQL "undefined_column"

    if (!shouldFallback && rpcError) {
      // RPC exists and returned a business logic error - handle it

      // Check for duplicate (idempotent success)
      if (
        rpcError.message?.includes('duplicate key') ||
        rpcError.message?.includes('unique constraint') ||
        rpcError.code === '23505'
      ) {
        console.log('[PURCHASE] Duplicate request detected, fetching existing order');

        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id, total_heartcoins')
          .eq('client_request_id', client_request_id)
          .single();

        if (existingOrder) {
          console.log('[PURCHASE] Returning existing order (idempotent):', existingOrder.id);
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

      // Handle specific error types
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

      // Return generic RPC error (only for non-schema errors)
      return NextResponse.json(
        { success: false, error: rpcError.message || 'Purchase failed', errorCode: 'PURCHASE_FAILED' },
        { status: 400 }
      );
    }

    // ============================================================
    // FALLBACK: Manual purchase logic
    // Used when RPC doesn't exist or has schema errors (e.g., column bugs)
    // ============================================================
    console.log('[PURCHASE] Using manual fallback (RPC unavailable or has schema error)');

    // 1. Check for existing order with same client_request_id (idempotency)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, total_heartcoins')
      .eq('client_request_id', client_request_id)
      .maybeSingle();

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
    // ============================================================
    // IMPORTANT: merch_items table has column `name`, NOT `item_name`
    // We select `name` here and map it to `item_name` when inserting into orders
    // ============================================================
    const { data: merchItem, error: merchError } = await supabase
      .from('merch_items')
      .select('id, name, price_heartcoins, is_active')  // `name` not `item_name`
      .eq('id', merchItemId)
      .single();

    if (merchError || !merchItem) {
      console.error('[PURCHASE] Merch item not found:', merchError?.message);
      return NextResponse.json(
        { success: false, error: 'Item not found or unavailable.', errorCode: 'ITEM_NOT_FOUND' },
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

    if (profileError || !profile) {
      console.error('[PURCHASE] Profile not found:', profileError?.message);
      return NextResponse.json(
        { success: false, error: 'User profile not found.', errorCode: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const unitPrice = merchItem.price_heartcoins || 0;
    const totalCost = unitPrice * quantity;
    const currentBalance = profile.heartcoin_balance || 0;

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
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ heartcoin_balance: newBalance })
      .eq('id', user.id);

    if (updateError) {
      console.error('[PURCHASE] Failed to deduct HeartCoins:', updateError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to process payment.', errorCode: 'PAYMENT_FAILED' },
        { status: 500 }
      );
    }

    // 5. Record HeartCoin transaction with client_request_id
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
      console.warn('[PURCHASE] Failed to record transaction (non-fatal):', txError.message);
      // Continue - order is more important
    }

    // 6. Create order record
    // ============================================================
    // COLUMN MAPPING: merch_items.name -> orders.item_name
    // merch_items table has `name`, orders table has `item_name`
    // ============================================================
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        merch_item_id: merchItem.id,
        item_name: merchItem.name,  // <-- MAPPING: merch_items.name -> orders.item_name
        quantity: quantity,
        price_heartcoins: unitPrice,
        total_heartcoins: totalCost,
        client_request_id: client_request_id,  // idempotencyKey passed through
        status: 'pending_shipping',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, total_heartcoins')
      .single();

    if (orderError) {
      console.error('[PURCHASE] Failed to create order:', orderError.message);
      // Attempt to refund the HeartCoins
      await supabase
        .from('profiles')
        .update({ heartcoin_balance: currentBalance })
        .eq('id', user.id);

      return NextResponse.json(
        { success: false, error: 'Failed to create order.', errorCode: 'ORDER_FAILED' },
        { status: 500 }
      );
    }

    console.log(`[PURCHASE] Fallback Success - Order ${order.id} created for user ${user.id}`);

    return NextResponse.json({
      success: true,
      order_id: String(order.id),
      user_id: user.id,
      amount_spent: totalCost,
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
