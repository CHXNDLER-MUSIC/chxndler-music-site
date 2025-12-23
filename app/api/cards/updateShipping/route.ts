import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

/**
 * Step 2 of physical card purchase: Update order with shipping info
 * Called after order is created via /api/cards/purchase-physical
 */
export async function POST(request: NextRequest) {
  try {
    const {
      orderId,
      full_name,
      address_line1,
      address_line2,
      city,
      state,
      zip,
      country
    } = await request.json();

    console.log('[CARD SHIPPING] Updating shipping for order:', orderId);

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: orderId' },
        { status: 400 }
      );
    }

    if (!full_name || !full_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Full name is required' },
        { status: 400 }
      );
    }

    if (!address_line1 || !address_line1.trim()) {
      return NextResponse.json(
        { success: false, error: 'Address line 1 is required' },
        { status: 400 }
      );
    }

    if (!city || !city.trim()) {
      return NextResponse.json(
        { success: false, error: 'City is required' },
        { status: 400 }
      );
    }

    if (!state || !state.trim()) {
      return NextResponse.json(
        { success: false, error: 'State is required' },
        { status: 400 }
      );
    }

    if (!zip || !zip.trim()) {
      return NextResponse.json(
        { success: false, error: 'ZIP code is required' },
        { status: 400 }
      );
    }

    if (!country || !country.trim()) {
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

    console.log('[CARD SHIPPING] User authenticated:', user.id);

    // Verify the order exists and belongs to this user
    const { data: existingOrder, error: lookupError } = await supabase
      .from('orders')
      .select('id, user_id, status, order_type')
      .eq('id', orderId)
      .single();

    if (lookupError || !existingOrder) {
      console.error('[CARD SHIPPING] Order not found:', lookupError);
      return NextResponse.json(
        { success: false, error: 'Order not found', errorCode: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (existingOrder.user_id !== user.id) {
      console.error('[CARD SHIPPING] Order does not belong to user');
      return NextResponse.json(
        { success: false, error: 'Order does not belong to you', errorCode: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }

    // Check order is in correct state for shipping update
    if (existingOrder.status !== 'pending_shipping' && existingOrder.status !== 'paid') {
      console.error('[CARD SHIPPING] Order not in pending_shipping state:', existingOrder.status);
      return NextResponse.json(
        { success: false, error: `Cannot update shipping. Order is in '${existingOrder.status}' state.`, errorCode: 'INVALID_ORDER_STATE' },
        { status: 400 }
      );
    }

    // Update order with shipping info
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        full_name: full_name.trim(),
        address_line1: address_line1.trim(),
        address_line2: address_line2?.trim() || null,
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        country: country.trim(),
        shipping_submitted: true,
        status: 'shipping_submitted'
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[CARD SHIPPING] Update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update shipping info', errorCode: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    console.log('[CARD SHIPPING] Shipping submitted for order:', orderId);

    return NextResponse.json({
      success: true,
      message: 'Shipping info submitted successfully!'
    });

  } catch (error) {
    console.error('[CARD SHIPPING] Unexpected error:', error);
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
