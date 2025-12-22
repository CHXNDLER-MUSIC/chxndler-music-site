import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const {
      orderId,
      shipping_full_name,
      shipping_address_line1,
      shipping_address_line2,
      shipping_city,
      shipping_state,
      shipping_zip,
      shipping_country
    } = await request.json();

    console.log('[SHIPPING] using orders.id', orderId);

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required field: orderId' },
        { status: 400 }
      );
    }

    if (!shipping_full_name || !shipping_full_name.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    if (!shipping_address_line1 || !shipping_address_line1.trim()) {
      return NextResponse.json(
        { error: 'Address line 1 is required' },
        { status: 400 }
      );
    }

    if (!shipping_city || !shipping_city.trim()) {
      return NextResponse.json(
        { error: 'City is required' },
        { status: 400 }
      );
    }

    if (!shipping_state || !shipping_state.trim()) {
      return NextResponse.json(
        { error: 'State is required' },
        { status: 400 }
      );
    }

    if (!shipping_zip || !shipping_zip.trim()) {
      return NextResponse.json(
        { error: 'ZIP code is required' },
        { status: 400 }
      );
    }

    // Get user from session - do NOT trust user_id from request body
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log(`[SHIPPING] User ${user.id} updating shipping info for order ${orderId}`);

    // Call the RPC with exact parameter names
    const { error: rpcError } = await supabase.rpc('update_order_shipping', {
      p_order_id: orderId,
      p_shipping_full_name: shipping_full_name,
      p_shipping_address_line1: shipping_address_line1,
      p_shipping_address_line2: shipping_address_line2 ?? null,
      p_shipping_city: shipping_city,
      p_shipping_state: shipping_state,
      p_shipping_zip: shipping_zip,
      p_shipping_country: shipping_country,
      p_user_id: user.id
    });

    if (rpcError) {
      console.error('[SHIPPING RPC ERROR]', rpcError);
      return NextResponse.json(
        {
          error: rpcError.message,
          details: rpcError.details
        },
        { status: 400 }
      );
    }

    console.log('[SHIPPING] Shipping saved for order:', orderId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[SHIPPING] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}