import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const {
      cardId,
      shipping_full_name,
      shipping_address_line1,
      shipping_address_line2,
      shipping_city,
      shipping_state,
      shipping_zip,
      shipping_country
    } = await request.json();

    console.log('[CARD PURCHASE] Physical card purchase request:', { cardId });

    // Validate required fields
    if (!cardId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: cardId' },
        { status: 400 }
      );
    }

    if (!shipping_full_name || !shipping_full_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Full name is required' },
        { status: 400 }
      );
    }

    if (!shipping_address_line1 || !shipping_address_line1.trim()) {
      return NextResponse.json(
        { success: false, error: 'Address line 1 is required' },
        { status: 400 }
      );
    }

    if (!shipping_city || !shipping_city.trim()) {
      return NextResponse.json(
        { success: false, error: 'City is required' },
        { status: 400 }
      );
    }

    if (!shipping_state || !shipping_state.trim()) {
      return NextResponse.json(
        { success: false, error: 'State is required' },
        { status: 400 }
      );
    }

    if (!shipping_zip || !shipping_zip.trim()) {
      return NextResponse.json(
        { success: false, error: 'ZIP code is required' },
        { status: 400 }
      );
    }

    if (!shipping_country || !shipping_country.trim()) {
      return NextResponse.json(
        { success: false, error: 'Country is required' },
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

    // Call the RPC to purchase physical card with shipping info
    // This RPC handles: order creation, HeartCoin deduction, and shipping info - all atomically
    const { data: orderId, error: rpcError } = await supabase.rpc(
      'purchase_physical_card_with_heartcoins',
      {
        p_card_id: cardId,
        p_full_name: shipping_full_name,
        p_address_line1: shipping_address_line1,
        p_address_line2: shipping_address_line2 || null,
        p_city: shipping_city,
        p_state: shipping_state,
        p_zip: shipping_zip,
        p_country: shipping_country
      }
    );

    if (rpcError) {
      console.error('[CARD PURCHASE] RPC Error:', rpcError);

      // Parse known error messages
      if (rpcError.message?.includes('INSUFFICIENT_FUNDS')) {
        const match = rpcError.message.match(/Have (\d+), need (\d+)/);
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient HeartCoins. You have ${match?.[1] || '?'}, need ${match?.[2] || '?'}.`,
            errorCode: 'INSUFFICIENT_FUNDS'
          },
          { status: 400 }
        );
      }

      if (rpcError.message?.includes('ITEM_NOT_FOUND')) {
        return NextResponse.json(
          { success: false, error: 'Card not found or not available for physical purchase.', errorCode: 'ITEM_NOT_FOUND' },
          { status: 404 }
        );
      }

      if (rpcError.message?.includes('USER_NOT_FOUND')) {
        return NextResponse.json(
          { success: false, error: 'User profile not found.', errorCode: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      if (rpcError.message?.includes('VALIDATION_ERROR')) {
        return NextResponse.json(
          { success: false, error: rpcError.message.replace('VALIDATION_ERROR: ', ''), errorCode: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: rpcError.message || 'Purchase failed', errorCode: 'RPC_FAILED' },
        { status: 400 }
      );
    }

    console.log('[CARD PURCHASE] orders.id', orderId);
    console.log('[CARD PURCHASE] Physical card purchase successful');

    return NextResponse.json({
      success: true,
      order_id: orderId,
      message: 'Physical card purchased successfully! Your order is being prepared.'
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
