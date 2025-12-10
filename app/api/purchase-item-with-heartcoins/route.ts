import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { itemId, itemTitle, priceHeartCoins, isPhysical } = await request.json();

    if (!itemId || !itemTitle || !priceHeartCoins) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Call the appropriate Supabase RPC function based on item type
    const functionName = isPhysical 
      ? 'purchase_physical_item_with_heartcoins' 
      : 'purchase_item_with_heartcoins';
    
    const params = isPhysical
      ? {
          p_user_id: user.id,
          p_item_slug: itemId,
          p_item_name: itemTitle,
          p_price_heartcoins: priceHeartCoins
        }
      : {
          p_user_id: user.id,
          p_item_id: itemId,
          p_item_name: itemTitle,
          p_price_heartcoins: priceHeartCoins
        };

    const { data: result, error: rpcError } = await supabase
      .rpc(functionName, params);

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      
      // Check if it's an insufficient funds error
      if (rpcError.message?.includes('Insufficient HeartCoins') || rpcError.message?.includes('Not enough HeartCoins')) {
        return NextResponse.json(
          { error: 'Insufficient HeartCoins. Please earn more coins and try again.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: rpcError.message || 'Purchase failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully purchased ${itemTitle} for ${priceHeartCoins} HeartCoins!`
    });

  } catch (error) {
    console.error('Purchase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}