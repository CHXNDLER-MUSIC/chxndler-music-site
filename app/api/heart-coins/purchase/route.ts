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
      .select('hearts')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    // Check if user has enough Heart Coins
    if (profile.hearts < heartCoins) {
      return NextResponse.json({ 
        error: `Insufficient Heart Coins. You have ${profile.hearts}, but need ${heartCoins}.` 
      }, { status: 400 });
    }

    // Deduct Heart Coins from user's balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        hearts: profile.hearts - heartCoins,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to deduct Heart Coins' }, { status: 500 });
    }

    // Note: For now, we're not storing the order as requested
    // In the future, you would insert the order details into an orders table here

    console.log('Heart Coins Purchase:', {
      userId: user.id,
      cardTitle,
      heartCoinsSpent: heartCoins,
      shippingAddress,
      email,
      phone,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Purchase completed successfully',
      heartCoinsSpent: heartCoins,
      remainingHearts: profile.hearts - heartCoins
    });

  } catch (error) {
    console.error('Heart Coins purchase error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}