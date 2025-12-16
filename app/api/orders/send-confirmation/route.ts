import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';
import { emailService, type OrderConfirmationData } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { orderId, shippingInfo } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required field: orderId' },
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

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        item_name,
        price_heartcoins,
        shipping_full_name,
        shipping_address_line1,
        shipping_address_line2,
        shipping_city,
        shipping_state,
        shipping_zip,
        shipping_country,
        status,
        created_at
      `)
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get user profile for email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, display_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Use user's email or fall back to auth email
    const customerEmail = profile.email || user.email;
    const customerName = profile.full_name || profile.display_name || 'HEARTVERSE Member';

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'No email address found for user' },
        { status: 400 }
      );
    }

    // Determine if it's a physical item based on shipping info or order status
    const isPhysicalItem = Boolean(
      order.shipping_full_name || 
      shippingInfo?.fullName || 
      order.status?.includes('shipping') ||
      order.status?.includes('fulfillment')
    );

    // Prepare order confirmation data
    const orderConfirmationData: OrderConfirmationData = {
      orderId: order.id.toString(),
      customerName,
      customerEmail,
      itemName: order.item_name,
      heartCoinsSpent: order.price_heartcoins || 0,
      isPhysicalItem,
      shippingAddress: (isPhysicalItem && (order.shipping_full_name || shippingInfo)) ? {
        fullName: order.shipping_full_name || shippingInfo?.fullName || '',
        addressLine1: order.shipping_address_line1 || shippingInfo?.addressLine1 || '',
        addressLine2: order.shipping_address_line2 || shippingInfo?.addressLine2 || '',
        city: order.shipping_city || shippingInfo?.city || '',
        state: order.shipping_state || shippingInfo?.state || '',
        zip: order.shipping_zip || shippingInfo?.zip || '',
        country: order.shipping_country || shippingInfo?.country || 'United States'
      } : undefined
    };

    // Send confirmation email
    const emailSent = await emailService.sendOrderConfirmation(orderConfirmationData);

    if (!emailSent) {
      // Don't fail the entire request if email fails, just log it
      console.warn(`Failed to send confirmation email for order ${orderId}`);
      return NextResponse.json({
        success: true,
        message: 'Order processed, but confirmation email failed to send',
        emailSent: false
      });
    }

    console.log(`Confirmation email sent successfully for order ${orderId} to ${customerEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Order confirmation email sent successfully',
      emailSent: true
    });

  } catch (error) {
    console.error('[EMAIL] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: `Failed to send confirmation email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        emailSent: false
      },
      { status: 500 }
    );
  }
}