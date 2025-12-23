import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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
    // Create cookie-based Supabase client for authenticated requests
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('[CARD PURCHASE] User authenticated:', user.id);

    // Parse request body
    const { cardId } = await request.json();

    // Validate required fields
    if (!cardId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: cardId' },
        { status: 400 }
      );
    }

    console.log('[CARD PURCHASE] Physical card purchase request:', { cardId });

    // Call the RPC to handle the entire purchase atomically
    // The RPC handles: balance check, deduction, order creation, transaction logging
    const { data, error } = await supabase.rpc('purchase_physical_card', {
      p_card_id: cardId
    });

    if (error) {
      console.error('[CARD PURCHASE] RPC error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create order',
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        { status: 500 }
      );
    }

    if (!data) {
      console.error('[CARD PURCHASE] RPC returned no orderId');
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create order - no order ID returned'
        },
        { status: 500 }
      );
    }

    console.log('[CARD PURCHASE] RPC success, orderId:', data);

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
      orderId: data,
      newBalance: newBalance,
      message: 'Order created! Please provide shipping details.'
    });

  } catch (error) {
    console.error('[CARD PURCHASE] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}
