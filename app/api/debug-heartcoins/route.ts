import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the user's profile with heartcoin data
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, name, heartcoin_balance, heartcoin_total, updated_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found', details: profileError }, { status: 404 });
    }

    // Get heartcoin transactions for debugging
    const { data: transactions, error: transactionError } = await supabaseClient
      .from('heartcoin_transactions')
      .select('id, amount, reason, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      user_id: user.id,
      profile: profile,
      recent_transactions: transactions || [],
      transaction_error: transactionError
    });
  } catch (error) {
    console.error('Debug heartcoins error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}