import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

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

    console.log(`[PURCHASE] User ${user.id} attempting to purchase ${quantity}x ${merchItemId}`);

    // Call the secure RPC function that uses database as source of truth
    const { data: result, error: rpcError } = await supabase
      .rpc('purchase_item_with_heartcoins', {
        p_user_id: user.id,
        p_merch_item_id: merchItemId,
        p_quantity: quantity
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
      
      return NextResponse.json(
        { 
          error: rpcError.message || 'Purchase failed',
          errorCode: 'PURCHASE_FAILED'
        },
        { status: 400 }
      );
    }

    console.log(`[PURCHASE] Success - Order ${result.order_id} created for user ${user.id}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully purchased ${result.item_name}${result.quantity > 1 ? ` (${result.quantity}x)` : ''} for ${result.amount_spent} HeartCoins!`
    });

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