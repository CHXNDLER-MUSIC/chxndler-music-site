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

    let result;

    if (isPhysical) {
      // Handle physical purchases manually since the RPC function doesn't exist
      try {
        // 1. Get current user balance
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('heartcoin_balance')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          return NextResponse.json(
            { error: 'User profile not found' },
            { status: 400 }
          );
        }

        const currentBalance = profile.heartcoin_balance || 0;

        // 2. Check if user has sufficient HeartCoins
        if (currentBalance < priceHeartCoins) {
          return NextResponse.json(
            { error: `Insufficient HeartCoins: you have ${currentBalance}, need ${priceHeartCoins}` },
            { status: 400 }
          );
        }

        const newBalance = currentBalance - priceHeartCoins;

        // 3. Start transaction - update balance
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ 
            heartcoin_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (balanceError) {
          console.error('Failed to update balance in Supabase', balanceError);
          return NextResponse.json(
            { 
              error: `Failed to update balance: ${balanceError.message}`,
              details: balanceError 
            },
            { status: 500 }
          );
        }

        // 4. Record the HeartCoin transaction
        const { data: transactionData, error: transactionError } = await supabase
          .from('heartcoin_transactions')
          .insert({
            user_id: user.id,
            amount: -priceHeartCoins,
            transaction_type: 'purchase',
            description: `Purchased ${itemTitle} from store`,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (transactionError) {
          console.error('Failed to record transaction in Supabase', transactionError);
          // Try to rollback balance update
          await supabase
            .from('profiles')
            .update({ heartcoin_balance: currentBalance })
            .eq('id', user.id);
          
          return NextResponse.json(
            { 
              error: `Failed to record transaction: ${transactionError.message}`,
              details: transactionError 
            },
            { status: 500 }
          );
        }

        // 5. Create order for shipping
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            item_id: itemId,
            item_name: itemTitle,
            price_heartcoins: priceHeartCoins,
            status: 'paid',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (orderError) {
          console.error('Failed to create order in Supabase', orderError, orderData);
          // Try to rollback previous changes
          await supabase
            .from('profiles')
            .update({ heartcoin_balance: currentBalance })
            .eq('id', user.id);
          
          return NextResponse.json(
            { 
              error: `Failed to create order: ${orderError.message}`,
              details: orderError 
            },
            { status: 500 }
          );
        }

        result = {
          success: true,
          id: orderData.id,
          previous_balance: currentBalance,
          new_balance: newBalance,
          amount_spent: priceHeartCoins,
          item_id: itemId,
          item_name: itemTitle,
          transaction_id: transactionData.id
        };

      } catch (error) {
        console.error('Physical purchase error:', error);
        return NextResponse.json(
          { 
            error: `Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error 
          },
          { status: 500 }
        );
      }
    } else {
      // Use existing RPC function for digital items
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('purchase_item_with_heartcoins', {
          p_user_id: user.id,
          p_item_id: itemId,
          p_item_name: itemTitle,
          p_price_heartcoins: priceHeartCoins
        });

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

      result = rpcResult;
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully purchased ${itemTitle} for ${priceHeartCoins} HeartCoins!`
    });

  } catch (error) {
    console.error('Purchase error:', error);
    return NextResponse.json(
      { 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error 
      },
      { status: 500 }
    );
  }
}