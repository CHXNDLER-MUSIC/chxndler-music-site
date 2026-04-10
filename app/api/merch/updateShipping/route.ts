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
      shipping_country,
      // Optional fallback identifiers
      client_request_id,
      merch_item_id
    } = await request.json();

    if (process.env.NODE_ENV !== "production") console.log('[SHIPPING] using orders.id', orderId);

    // Validate identity: obtain user first (needed for fallback lookup)

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

    // Fallback: If orderId not provided, attempt to resolve via client_request_id or merch_item_id/item_id
    let resolvedOrderId: any = orderId;
    if (!resolvedOrderId) {
      try {
        // Prefer idempotency key when available
        if (client_request_id) {
          const { data: orderByKey } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', user.id)
            .eq('client_request_id', client_request_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (orderByKey?.id) resolvedOrderId = orderByKey.id;
        }
        // Next, try by merch_item_id
        if (!resolvedOrderId && merch_item_id) {
          const { data: orderByItem } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', user.id)
            .eq('merch_item_id', merch_item_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (orderByItem?.id) resolvedOrderId = orderByItem.id;
        }
        // Some legacy rows may use item_id instead of merch_item_id
        if (!resolvedOrderId && merch_item_id) {
          const { data: orderByLegacyItem } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', user.id)
            .eq('item_id', merch_item_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (orderByLegacyItem?.id) resolvedOrderId = orderByLegacyItem.id;
        }

        // Final small retry window to allow transaction commit/replication
        if (!resolvedOrderId && (client_request_id || merch_item_id)) {
          for (let i = 0; i < 3 && !resolvedOrderId; i++) {
            await new Promise(res => setTimeout(res, 150));
            const { data: byEither } = await supabase
              .from('orders')
              .select('id, client_request_id, merch_item_id, item_id')
              .eq('user_id', user.id)
              .or(
                [
                  client_request_id ? `client_request_id.eq.${client_request_id}` : '',
                  merch_item_id ? `merch_item_id.eq.${merch_item_id}` : '',
                  merch_item_id ? `item_id.eq.${merch_item_id}` : ''
                ].filter(Boolean).join(',')
              )
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (byEither?.id) resolvedOrderId = byEither.id;
          }
        }
      } catch (lookupErr) {
        console.warn('[SHIPPING] Fallback lookup failed:', lookupErr);
      }
    }

    // Validate required fields
    if (!resolvedOrderId) {
      return NextResponse.json(
        { error: 'Missing required field: orderId' },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV !== "production") console.log(`[SHIPPING] User ${user.id} updating shipping info for order ${resolvedOrderId}`);

    // Call the RPC with exact parameter names
    const parsedOrderId = (typeof resolvedOrderId === 'string' && /^\d+$/.test(resolvedOrderId))
      ? Number(resolvedOrderId)
      : resolvedOrderId;

    const { error: rpcError } = await supabase.rpc('update_order_shipping', {
      p_order_id: parsedOrderId,
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

    if (process.env.NODE_ENV !== "production") console.log('[SHIPPING] Shipping saved for order:', resolvedOrderId);

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
