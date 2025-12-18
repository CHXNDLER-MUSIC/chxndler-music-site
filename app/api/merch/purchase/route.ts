import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt, getSupabaseAdmin } from '@/lib/supabaseServer';
import type { PurchaseWithHeartcoinsResult } from '@/types/merch';

export async function POST(request: NextRequest) {
  try {
    const {
      merchItemId,
      quantity = 1,
      // Optional shipping fields (required for physical items)
      shippingFullName,
      shippingAddressLine1,
      shippingAddressLine2,
      shippingCity,
      shippingState,
      shippingZip,
      shippingCountry,
    } = await request.json();

    if (!merchItemId) {
      return NextResponse.json(
        { error: 'Missing required field: merchItemId' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be a positive integer' },
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

    console.log('[PURCHASE] Attempting purchase:', { merch_item_id: merchItemId, qty: quantity, user_id: user.id });

    // Determine item category to validate shipping as needed
    // Look up merch item using admin client to avoid RLS surprises during read-only lookup.
    // Accept either UUID id or slug (optionally provided by client).
    const admin = getSupabaseAdmin();
    let merchItem: any = null;
    let merchLookupError: any = null;

    const {
      merchItemSlug
    }: { merchItemSlug?: string } = (await request.clone().json().catch(() => ({}))) as any;

    const { data: byId, error: byIdError } = await admin
      .from('merch_items')
      .select('id, name, category, price_heartcoins, slug, is_active')
      .eq('id', merchItemId)
      .single();
    merchItem = byId;
    merchLookupError = byIdError;

    if (merchLookupError || !merchItem) {
      console.warn('[PURCHASE] Item lookup by id failed; trying slug fallback', { merchItemId, merchItemSlug });
      const slugToTry = merchItemSlug || String(merchItemId);
      const { data: bySlug, error: slugError } = await admin
        .from('merch_items')
        .select('id, name, category, price_heartcoins, slug, is_active')
        .eq('slug', slugToTry)
        .single();
      merchItem = bySlug as any;
      merchLookupError = slugError;
    }

    if (merchLookupError || !merchItem) {
      return NextResponse.json(
        { error: 'Item not found or no longer available.', errorCode: 'ITEM_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!merchItem?.is_active) {
      return NextResponse.json(
        { error: 'Item not found or no longer available.', errorCode: 'ITEM_NOT_FOUND' },
        { status: 404 }
      );
    }

    const isPhysical = merchItem.category === 'physical';

    // If physical, validate shipping fields early
    if (isPhysical) {
      if (!shippingFullName || !shippingAddressLine1 || !shippingCity || !shippingState || !shippingZip) {
        return NextResponse.json(
          { error: 'Missing shipping address fields', errorCode: 'MISSING_SHIPPING' },
          { status: 400 }
        );
      }
    }

    // Prefer canonical single-item checkout RPC that accepts shipping
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('checkout_merch_with_heartcoins', {
        p_merch_item_id: merchItemId,
        p_quantity: quantity,
        p_full_name: shippingFullName ?? '',
        p_address_line1: shippingAddressLine1 ?? '',
        p_address_line2: shippingAddressLine2 ?? null,
        p_city: shippingCity ?? '',
        p_state: shippingState ?? '',
        p_zip: shippingZip ?? '',
        p_country: shippingCountry ?? 'United States',
      });

    // RPC returns the UUID order_id directly
    const orderIdFromRpc: string | null = rpcData ? String(rpcData) : null;

    console.log('[PURCHASE] checkout RPC response:', { error: rpcError, orderId: orderIdFromRpc });

    if (rpcError) {
      console.error('[PURCHASE] RPC Error:', rpcError);

      // Handle specific error types with user-friendly messages
      if (rpcError.message?.includes('INSUFFICIENT_HEARTCOINS')) {
        const match = rpcError.message.match(/Have (\d+), need (\d+)/);
        const have = match ? match[1] : '?';
        const need = match ? match[2] : '?';
        return NextResponse.json(
          {
            error: `Insufficient HeartCoins. You have ${have}, but need ${need}. Earn more by completing quests!`,
            errorCode: 'INSUFFICIENT_HEARTCOINS'
          },
          { status: 400 }
        );
      }

      if (rpcError.message?.includes('ITEM_NOT_FOUND')) {
        return NextResponse.json(
          {
            error: 'Item not found or no longer available.',
            errorCode: 'ITEM_NOT_FOUND'
          },
          { status: 404 }
        );
      }

      if (rpcError.message?.includes('USER_NOT_FOUND')) {
        return NextResponse.json(
          {
            error: 'User profile not found. Please refresh and try again.',
            errorCode: 'USER_NOT_FOUND'
          },
          { status: 404 }
        );
      }

      if (rpcError.message?.includes('INVALID_QUANTITY')) {
        return NextResponse.json(
          {
            error: 'Invalid quantity. Must be at least 1.',
            errorCode: 'INVALID_QUANTITY'
          },
          { status: 400 }
        );
      }

      // Graceful fallback: only if function missing or schema cache issues
      if (
        rpcError.message?.includes('Could not find the function') ||
        rpcError.message?.includes('checkout_merch_with_heartcoins') ||
        rpcError.message?.includes('schema cache') ||
        rpcError.message?.toLowerCase?.().includes('function not found') ||
        rpcError.message?.toLowerCase?.().includes('rpc not available')
      ) {
        console.warn('[PURCHASE] RPC purchase_merch_with_heartcoins missing; using manual fallback flow');

        // 1) Fetch merch item details and validate availability
        // merchItem already fetched above

        // 2) Get current user balance
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('heartcoin_balance')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          return NextResponse.json(
            {
              error: 'User profile not found. Please refresh and try again.',
              errorCode: 'USER_NOT_FOUND'
            },
            { status: 404 }
          );
        }

        const unitPrice = merchItem.price_heartcoins || 0;
        const totalPrice = unitPrice * quantity;
        const currentBalance = profile.heartcoin_balance || 0;

        if (currentBalance < totalPrice) {
          return NextResponse.json(
            {
              error: `Insufficient HeartCoins. You have ${currentBalance}, but need ${totalPrice}. Earn more by completing quests!`,
              errorCode: 'INSUFFICIENT_HEARTCOINS'
            },
            { status: 400 }
          );
        }

        const newBalance = currentBalance - totalPrice;

        // 3) Deduct HeartCoins
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ heartcoin_balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (balanceError) {
          return NextResponse.json(
            {
              error: `Failed to update balance: ${balanceError.message}`,
              errorCode: 'BALANCE_UPDATE_FAILED'
            },
            { status: 500 }
          );
        }

        // 4) Record heartcoin transaction
        const { data: tx, error: txError } = await supabase
          .from('heartcoin_transactions')
          .insert({
            user_id: user.id,
            amount: -totalPrice,
            transaction_type: 'purchase',
            description: `Purchased ${merchItem.name} from store`,
            metadata: {
              merch_item_id: merchItem.id,
              quantity,
              unit_price: unitPrice
            },
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (txError) {
          // Attempt to rollback balance
          await supabase
            .from('profiles')
            .update({ heartcoin_balance: currentBalance })
            .eq('id', user.id);

          return NextResponse.json(
            {
              error: `Failed to record transaction: ${txError.message}`,
              errorCode: 'TXN_FAILED'
            },
            { status: 500 }
          );
        }

        // 5) Create order
        const orderStatus = merchItem.category === 'physical' ? 'pending_shipping' : 'paid';
        console.log('[PURCHASE] Creating order with data:', {
          user_id: user.id,
          item_id: merchItem.slug,
          item_name: merchItem.name,
          price_heartcoins: totalPrice,
          status: orderStatus
        });

        // First check if orders table exists and what columns it has
        const { data: tableInfo, error: tableError } = await supabase
          .from('orders')
          .select('*')
          .limit(1);
          
        console.log('[PURCHASE] Orders table check:', { tableInfo, tableError });
        
        let order: { id: string | number } | null = null;
        let orderError: any = null;

        // Try inserting using the new schema first
        const { data: orderNew, error: orderNewError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            item_id: merchItem.slug,
            item_name: merchItem.name,
            // use canonical column name per migrations
            total_heartcoins: totalPrice,
            status: orderStatus,
            // persist shipping if provided (best-effort)
            shipping_full_name: shippingFullName ?? null,
            shipping_address_line1: shippingAddressLine1 ?? null,
            shipping_address_line2: shippingAddressLine2 ?? null,
            shipping_city: shippingCity ?? null,
            shipping_state: shippingState ?? null,
            shipping_zip: shippingZip ?? null,
            shipping_country: shippingCountry ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
        order = orderNew as any;
        orderError = orderNewError;

        console.log('[PURCHASE] Order creation (new schema) result:', { order: orderNew, error: orderNewError });

        // If the new schema insert failed (likely due to missing columns in legacy DB),
        // fall back to inserting with the legacy orders schema.
        if (orderError) {
          console.warn('[PURCHASE] New schema insert failed, attempting legacy orders insert...');

          // Fetch profile for email fallback if needed by legacy schema
          const { data: profileForEmail } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', user.id)
            .single();

          const legacyPayload = {
            user_id: user.id,
            card_title: merchItem.name,
            heart_coins_spent: totalPrice,
            full_name: shippingFullName ?? '',
            street_address: shippingAddressLine1 ?? '',
            apartment: shippingAddressLine2 ?? null,
            city: shippingCity ?? '',
            state_region: shippingState ?? '',
            zip_postal: shippingZip ?? '',
            country: shippingCountry ?? 'United States',
            email: profileForEmail?.email || user.email || '',
            phone: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data: orderLegacy, error: orderLegacyError } = await supabase
            .from('orders')
            .insert(legacyPayload)
            .select('id')
            .single();

          console.log('[PURCHASE] Order creation (legacy schema) result:', { orderLegacy, error: orderLegacyError });

          order = orderLegacy as any;
          orderError = orderLegacyError;

          if (orderError) {
            // Attempt to rollback balance
            await supabase
              .from('profiles')
              .update({ heartcoin_balance: currentBalance })
              .eq('id', user.id);

            return NextResponse.json(
              {
                error: `Failed to create order: ${orderError.message}`,
                errorCode: 'ORDER_FAILED'
              },
              { status: 500 }
            );
          }
        }

        // 6) For digital items, record in user_items
        if (merchItem.category === 'digital') {
          const { error: userItemError } = await supabase
            .from('user_items')
            .insert({
              user_id: user.id,
              item_id: merchItem.slug,
              item_name: merchItem.name,
              item_type: 'digital',
              acquisition_method: 'heartcoin_purchase',
              metadata: {
                merch_item_id: merchItem.id,
                order_id: order?.id,
                transaction_id: tx.id
              },
              acquisition_date: new Date().toISOString(),
              created_at: new Date().toISOString()
            });

          if (userItemError) {
            console.warn('[PURCHASE] Failed to record user_items entry:', userItemError);
            // We proceed; not critical for physical items and can be reconciled later
          }
        }

        const normalized: PurchaseWithHeartcoinsResult = {
          success: true,
          message: `Successfully purchased ${merchItem.name} for ${totalPrice} HeartCoins!`,
          order_id: order?.id ? String(order.id) : null,
          user_id: String(user.id),
          heartcoins_before: currentBalance,
          heartcoins_after: newBalance,
          amount_spent: totalPrice,
        };
        
        console.log('[PURCHASE] Normalized response:', normalized);

        console.log(`[PURCHASE] Fallback success - Order ${order.id} created for user ${user.id}`);

        return NextResponse.json(normalized);
      }

      // Default error response
      return NextResponse.json(
        {
          error: rpcError.message || 'Purchase failed',
          errorCode: 'PURCHASE_FAILED'
        },
        { status: 400 }
      );
    }

    // If checkout RPC succeeded
    if (orderIdFromRpc) {
      const normalized: PurchaseWithHeartcoinsResult = {
        success: true,
        message: 'Purchase completed',
        order_id: orderIdFromRpc,
        user_id: String(user.id),
        heartcoins_before: null,
        heartcoins_after: null,
        amount_spent: Number(merchItem.price_heartcoins || 0) * Number(quantity || 1),
      };
      console.log(`[PURCHASE] Success - Order ${normalized.order_id} created for user ${user.id}`);
      return NextResponse.json(normalized);
    }

  } catch (error) {
    console.error('[PURCHASE] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
