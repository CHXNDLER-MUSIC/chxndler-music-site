import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';
import type { PurchaseWithHeartcoinsResult } from '@/types/merch';

export async function POST(request: NextRequest) {
  try {
    const { merchItemId, quantity = 1 } = await request.json();

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

    console.log(`[PURCHASE] User ${user.id} attempting purchase ${quantity}x of merch ${merchItemId}`);

    // Call the secure RPC function that uses database as source of truth
    // Primary path: use the secure RPC overload
    const { data: result, error: rpcError } = await supabase
      .rpc('purchase_item_with_heartcoins', {
        p_user_id: user.id,
        p_merch_item_id: merchItemId,
        p_quantity: quantity,
      });

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
        rpcError.message?.includes('schema cache') ||
        rpcError.message?.toLowerCase?.().includes('function not found') ||
        rpcError.message?.toLowerCase?.().includes('rpc not available')
      ) {
        console.warn('[PURCHASE] RPC missing; using manual fallback flow');

        // 1) Fetch merch item details and validate availability
        const { data: merchItem, error: merchError } = await supabase
          .from('merch_items')
          .select('id, name, slug, category, is_active, price_heartcoins')
          .eq('id', merchItemId)
          .eq('is_active', true)
          .single();

        if (merchError || !merchItem) {
          return NextResponse.json(
            {
              error: 'Item not found or no longer available.',
              errorCode: 'ITEM_NOT_FOUND'
            },
            { status: 404 }
          );
        }

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
        
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            item_id: merchItem.slug,
            item_name: merchItem.name,
            price_heartcoins: totalPrice,
            status: orderStatus,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
          
        console.log('[PURCHASE] Order creation result:', { order, error: orderError });

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

    // Normalize RPC result (support JSON or TABLE return shapes)
    // Preferred TABLE overload returns fields directly; some environments may return JSON
    const normalized: PurchaseWithHeartcoinsResult = (() => {
      if (!result) {
        return {
          success: false,
          message: 'Unknown purchase result',
          order_id: null,
          user_id: null,
          heartcoins_before: null,
          heartcoins_after: null,
          amount_spent: 0,
        };
      }
      // If the function returns JSON, unwrap it
      const r: any = typeof result === 'object' ? result : {};
      const maybeJson = r.success !== undefined && (r.order_id !== undefined || r.amount_spent !== undefined);
      if (maybeJson) {
        return {
          success: Boolean(r.success),
          message: String(r.message ?? 'Purchase completed'),
          order_id: r.order_id != null ? String(r.order_id) : null,
          user_id: r.user_id != null ? String(r.user_id) : null,
          heartcoins_before: r.previous_balance ?? r.heartcoins_before ?? null,
          heartcoins_after: r.new_balance ?? r.heartcoins_after ?? null,
          amount_spent: Number(r.amount_spent ?? 0),
        };
      }
      // TABLE overload - expect exact fields
      return {
        success: Boolean((r as any).success),
        message: String((r as any).message ?? 'Purchase completed'),
        order_id: (r as any).order_id != null ? String((r as any).order_id) : null,
        user_id: (r as any).user_id != null ? String((r as any).user_id) : null,
        heartcoins_before: (r as any).heartcoins_before ?? null,
        heartcoins_after: (r as any).heartcoins_after ?? null,
        amount_spent: Number((r as any).amount_spent ?? 0),
      };
    })();

    console.log(`[PURCHASE] Success - Order ${normalized.order_id} created for user ${user.id}`);

    return NextResponse.json(normalized);

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
