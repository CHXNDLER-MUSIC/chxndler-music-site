import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { 
      orderId, 
      fullName, 
      addressLine1, 
      addressLine2, 
      city, 
      state, 
      zip, 
      country = 'United States' 
    } = await request.json();

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required field: orderId' },
        { status: 400 }
      );
    }

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    if (!addressLine1 || !addressLine1.trim()) {
      return NextResponse.json(
        { error: 'Address line 1 is required' },
        { status: 400 }
      );
    }

    if (!city || !city.trim()) {
      return NextResponse.json(
        { error: 'City is required' },
        { status: 400 }
      );
    }

    if (!state || !state.trim()) {
      return NextResponse.json(
        { error: 'State is required' },
        { status: 400 }
      );
    }

    if (!zip || !zip.trim()) {
      return NextResponse.json(
        { error: 'ZIP code is required' },
        { status: 400 }
      );
    }

    // Get user from session
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log(`[SHIPPING] User ${user.id} updating shipping info for order ${orderId}`);

    // Call the RPC function to update shipping information
    const { data: result, error: rpcError } = await supabase
      .rpc('update_order_shipping', {
        p_user_id: user.id,
        p_order_id: orderId,
        p_shipping_full_name: fullName,
        p_shipping_address_line1: addressLine1,
        p_shipping_address_line2: addressLine2 || null,
        p_shipping_city: city,
        p_shipping_state: state,
        p_shipping_zip: zip,
        p_shipping_country: country
      });

    if (rpcError) {
      console.error('[SHIPPING] RPC Error:', rpcError);
      
      // Handle specific error types with user-friendly messages
      if (rpcError.message?.includes('ORDER_NOT_FOUND')) {
        return NextResponse.json(
          { 
            error: 'Order not found or does not belong to you.',
            errorCode: 'ORDER_NOT_FOUND'
          },
          { status: 404 }
        );
      }
      
      if (rpcError.message?.includes('INVALID_ORDER_STATE')) {
        const match = rpcError.message.match(/Order is in (\w+) state/);
        const status = match ? match[1] : 'invalid';
        return NextResponse.json(
          { 
            error: `Cannot update shipping info. Order is in '${status}' state.`,
            errorCode: 'INVALID_ORDER_STATE'
          },
          { status: 400 }
        );
      }

      if (rpcError.message?.includes('MISSING_FIELD')) {
        const match = rpcError.message.match(/MISSING_FIELD: (.+)/);
        const field = match ? match[1] : 'Required field';
        return NextResponse.json(
          { 
            error: `${field} is required.`,
            errorCode: 'MISSING_FIELD'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: rpcError.message || 'Failed to update shipping information',
          errorCode: 'SHIPPING_UPDATE_FAILED'
        },
        { status: 400 }
      );
    }

    console.log(`[SHIPPING] Success - Order ${orderId} shipping info updated`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Shipping information updated successfully! Your order is being prepared for fulfillment.'
    });

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