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
    
    const { heartCoinsToAdd } = body;

    // Validate input
    if (typeof heartCoinsToAdd !== 'number' || heartCoinsToAdd <= 0) {
      return NextResponse.json({ error: 'Invalid heart coins amount' }, { status: 400 });
    }

    // Get user's current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('heartcoin_balance, heartcoin_total, journey')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    const currentCoins = profile?.heartcoin_balance || 0;
    const totalCoins = profile?.heartcoin_total || 0;
    
    const newCurrentCoins = currentCoins + heartCoinsToAdd;
    const newTotalCoins = totalCoins + heartCoinsToAdd;

    // Update heart coins (trigger will automatically update journey)
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        heartcoin_balance: newCurrentCoins,
        heartcoin_total: newTotalCoins,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('heartcoin_balance, heartcoin_total, journey')
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update heart coins' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Heart coins updated successfully',
      heartCoinsAdded: heartCoinsToAdd,
      currentHeartCoins: updatedProfile.heartcoin_balance,
      totalHeartCoins: updatedProfile.heartcoin_total,
      journey: updatedProfile.journey
    });

  } catch (error) {
    console.error('Heart coins update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
