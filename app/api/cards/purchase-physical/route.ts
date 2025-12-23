import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

/**
 * Step 1 of physical card purchase: Create order via RPC, deduct HeartCoins
 * Uses the purchase_physical_card RPC which handles:
 * - Balance check & deduction
 * - Order creation with requires_shipping=true, shipping_submitted=false
 * - HeartCoin transaction logging
 * Shipping info is added in step 2 via /api/cards/updateShipping
 */
export async function POST(request: NextRequest) {
  try {
    const { cardId } = await request.json();

    console.log('[CARD PURCHASE] Physical card purchase request:', { cardId });

    // Validate required fields
    if (!cardId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: cardId' },
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

    console.log('[CARD PURCHASE] User authenticated:', user.id);

    // Call the RPC to handle the entire purchase atomically
    // The RPC handles: balance check, deduction, order creation, transaction logging
    const { data: orderId, error: rpcError } = await supabase.rpc('purchase_physical_card', {
      p_card_id: cardId
    });

    if (rpcError) {
      console.error('[CARD PURCHASE] RPC error:', {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create order',
          errorCode: 'ORDER_CREATE_FAILED',
          debug: {
            message: rpcError.message,
            details: rpcError.details,
            hint: rpcError.hint,
            code: rpcError.code
          }
        },
        { status: 500 }
      );
    }

    if (!orderId) {
      console.error('[CARD PURCHASE] RPC returned no orderId');
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create order - no order ID returned',
          errorCode: 'ORDER_CREATE_FAILED'
        },
        { status: 500 }
      );
    }

    console.log('[CARD PURCHASE] RPC success, orderId:', orderId);

    // Get updated balance to return to client
    const { data: profile } = await supabase
      .from('profiles')
      .select('heartcoin_balance')
      .eq('id', user.id)
      .single();

    const newBalance = profile?.heartcoin_balance ?? null;
    console.log('[CARD PURCHASE] Physical card purchase successful, newBalance:', newBalance);

    return NextResponse.json({
      success: true,
      orderId: orderId,
      newBalance: newBalance,
      message: 'Order created! Please provide shipping details.'
    });

  } catch (error) {
    console.error('[CARD PURCHASE] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
