import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

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
    // Read cookie to propagate user context to RPC while using service role
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[CARD PURCHASE DEBUG] Cookie names:', allCookies.map(c => c.name));
    console.log('[CARD PURCHASE DEBUG] sb-* cookies:', allCookies.filter(c => c.name.startsWith('sb-')).map(c => ({ name: c.name, valueLen: c.value?.length })));

    const token = cookieStore.get('sb-access-token')?.value || '';
    console.log('[CARD PURCHASE DEBUG] sb-access-token found:', !!token, 'length:', token?.length || 0);
    if (!token) {
      console.log('[CARD PURCHASE DEBUG] No sb-access-token cookie - returning 401');
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

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

    // Create a Supabase SERVICE ROLE client and forward the user's JWT
    // so the RPC can use auth.uid() while bypassing RLS where needed.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    // Call the RPC to handle the entire purchase atomically
    // The RPC handles: balance check, deduction, order creation, transaction logging
    const { data, error } = await supabase.rpc('purchase_physical_card', {
      p_card_id: cardId,
    });

    if (error) {
      console.error('[CARD PURCHASE] RPC error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      // Map known failures to 400s; default to 400 for RPC errors
      const msg = error.message || 'Purchase failed';
      const isInsufficient = /INSUFFICIENT|INSUFFICIENT_FUNDS|INSUFFICIENT_HEARTCOINS/i.test(msg);
      const status = isInsufficient ? 400 : 400;
      return NextResponse.json(
        { success: false, error: msg },
        { status }
      );
    }

    if (!data) {
      console.error('[CARD PURCHASE] RPC returned no data');
      return NextResponse.json(
        { success: false, error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // RPC may return a UUID (legacy) or an object with fields
    let orderId: string | null = null;
    let newBalance: number | null = null;
    let cost: number | null = null;

    if (typeof data === 'string') {
      // Legacy RPC returned UUID string
      orderId = data;
    } else if (Array.isArray(data)) {
      const row = data[0] as any;
      orderId = row?.order_id ?? row?.id ?? null;
      newBalance = typeof row?.new_balance === 'number' ? row.new_balance : null;
      cost = typeof row?.cost === 'number' ? row.cost : null;
    } else if (typeof data === 'object' && data !== null) {
      const row = data as any;
      orderId = row?.order_id ?? row?.id ?? null;
      newBalance = typeof row?.new_balance === 'number' ? row.new_balance : null;
      cost = typeof row?.cost === 'number' ? row.cost : null;
    }

    if (!orderId) {
      console.error('[CARD PURCHASE] RPC returned no orderId in payload:', data);
      return NextResponse.json(
        { success: false, error: 'Failed to create order' },
        { status: 500 }
      );
    }

    console.log('[CARD PURCHASE] RPC success:', { orderId, newBalance, cost });

    return NextResponse.json({
      success: true,
      orderId,
      newBalance,
      cost,
    });

  } catch (error) {
    console.error('[CARD PURCHASE] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
