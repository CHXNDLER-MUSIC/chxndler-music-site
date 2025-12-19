import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';
import { logHeartcoinTransaction } from '@/utils/heartcoins';

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
    
    const { heartCoinsToAdd, reason, description, metadata } = body;

    // Validate input
    if (typeof heartCoinsToAdd !== 'number' || heartCoinsToAdd <= 0) {
      return NextResponse.json({ error: 'Invalid heart coins amount' }, { status: 400 });
    }

    // Get user's current profile
    // Record HeartCoin earn transaction; DB trigger updates balances
    await logHeartcoinTransaction(supabase, {
      user_id: user.id,
      amount: heartCoinsToAdd,
      reason: reason || 'GENERIC_AWARD',
      description: description,
      transaction_type: 'bonus',
      metadata: metadata || {}
    });

    return NextResponse.json({
      success: true,
      message: 'Heart coins updated successfully',
      heartCoinsAdded: heartCoinsToAdd
    });

  } catch (error) {
    console.error('Heart coins update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
