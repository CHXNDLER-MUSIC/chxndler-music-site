import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';
import { emailService, type ShippingNotificationData } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { 
      orderId, 
      trackingNumber, 
      shippingCarrier, 
      estimatedDelivery 
    } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required field: orderId' },
        { status: 400 }
      );
    }

    // Get user from session (this would typically be called by admin/shipping system)
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    
    // Get order details with user information
    const { data: orderWithUser, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        item_name,
        user_id,
        status,
        profiles!inner(email, full_name, display_name)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !orderWithUser) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const profile = orderWithUser.profiles;
    const customerEmail = profile.email;
    const customerName = profile.full_name || profile.display_name || 'HEARTVERSE Member';

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'No email address found for order customer' },
        { status: 400 }
      );
    }

    // Update order status to shipped if tracking info provided
    if (trackingNumber) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'shipped',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.warn(`Failed to update order status for ${orderId}:`, updateError);
      }
    }

    // Prepare shipping notification data
    const shippingNotificationData: ShippingNotificationData = {
      orderId: orderWithUser.id.toString(),
      customerName,
      customerEmail,
      itemName: orderWithUser.item_name,
      trackingNumber,
      shippingCarrier,
      estimatedDelivery
    };

    // Send shipping notification email
    const emailSent = await emailService.sendShippingNotification(shippingNotificationData);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send shipping notification email' },
        { status: 500 }
      );
    }

    console.log(`Shipping notification email sent successfully for order ${orderId} to ${customerEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Shipping notification email sent successfully',
      emailSent: true
    });

  } catch (error) {
    console.error('[SHIPPING_EMAIL] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: `Failed to send shipping notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        emailSent: false
      },
      { status: 500 }
    );
  }
}