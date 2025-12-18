import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userResult?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = userResult.user;
    const body = await req.json();
    
    const {
      cardTitle,
      heartCoins,
      shippingAddress,
      email,
      phone
    } = body;

    // Validate required fields
    if (!cardTitle || !heartCoins || !shippingAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const {
      fullName,
      streetAddress,
      city,
      stateRegion,
      zipPostal,
      country
    } = shippingAddress;

    if (!fullName || !streetAddress || !city || !stateRegion || !zipPostal || !country) {
      return NextResponse.json({ error: 'Missing shipping address fields' }, { status: 400 });
    }

    // Get user's current Heart Coins balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('heartcoin_balance, heartcoin_total')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    // Check if user has enough Heart Coins
    if ((profile.heartcoin_balance || 0) < heartCoins) {
      return NextResponse.json({ 
        error: `Insufficient Heart Coins. You have ${profile.heartcoin_balance || 0}, but need ${heartCoins}.` 
      }, { status: 400 });
    }

    // Create orders table if it doesn't exist
    const { error: createTableError } = await supabase.rpc('create_orders_table_if_not_exists');
    
    if (createTableError) {
      console.warn('Could not ensure orders table exists:', createTableError);
    }

    // Save the order details in the database
    const orderData = {
      user_id: user.id,
      card_title: cardTitle,
      heart_coins_spent: heartCoins,
      full_name: fullName,
      street_address: streetAddress,
      apartment: shippingAddress.apartment || null,
      city,
      state_region: stateRegion,
      zip_postal: zipPostal,
      country,
      email: email || user.email,
      phone: phone || null,
      created_at: new Date().toISOString()
    };

    const { error: orderError } = await supabase
      .from('orders')
      .insert(orderData);

    if (orderError) {
      console.error('Failed to save order:', orderError);
      // Don't fail the purchase if order save fails, but log it
    }

    // Deduct Heart Coins from user's balance (total remains unchanged for cumulative tracking)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        heartcoin_balance: (profile.heartcoin_balance || 0) - heartCoins,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to deduct Heart Coins' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase completed successfully',
      heartCoinsSpent: heartCoins,
      remainingHearts: (profile.heartcoin_balance || 0) - heartCoins
    });

  } catch (error) {
    console.error('Heart Coins purchase error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
