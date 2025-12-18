import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';

    if (!token) {
      return NextResponse.json({
        status: 'not_authenticated',
        message: 'Authentication required'
      }, { status: 401 });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: userResult, error: userError } = await supabase.auth.getUser();

    if (userError || !userResult?.user) {
      return NextResponse.json({
        status: 'not_authenticated',
        message: 'Authentication failed'
      }, { status: 401 });
    }

    const body = await req.json();
    const { phrase } = body;

    // Validate input
    const trimmedPhrase = phrase?.trim();
    if (!trimmedPhrase) {
      return NextResponse.json({
        status: 'invalid',
        message: 'Phrase is required'
      }, { status: 400 });
    }

    // Call the RPC to redeem the secret phrase
    // The RPC handles all validation, redemption tracking, and coin awarding
    const { data, error } = await supabase.rpc('redeem_secret_phrase', {
      p_phrase: trimmedPhrase
    });

    if (error) {
      console.error('Secret phrase RPC error:', error);
      return NextResponse.json({
        status: 'error',
        message: error.message || 'Failed to redeem phrase'
      }, { status: 500 });
    }

    // Handle RPC response - the RPC returns an array with one row
    const result = data?.[0] || data;

    if (!result || !result.status) {
      console.error('Unexpected RPC response:', data);
      return NextResponse.json({
        status: 'error',
        message: 'Unexpected response from server'
      }, { status: 500 });
    }

    // Map RPC status to appropriate HTTP response
    switch (result.status) {
      case 'success':
      case 'redeemed':
        return NextResponse.json({
          status: 'success',
          message: `Signal accepted! You earned ${result.awarded || result.reward || 0} Heart Coins.`,
          rewardHeartCoins: result.awarded || result.reward || 0,
          phrase_id: result.phrase_id
        }, { status: 200 });

      case 'already_redeemed':
      case 'already_checked_in':
        return NextResponse.json({
          status: 'already_redeemed',
          message: 'Already checked in'
        }, { status: 200 });

      case 'invalid':
      case 'incorrect':
        return NextResponse.json({
          status: 'invalid',
          message: 'Incorrect phrase'
        }, { status: 200 });

      case 'not_authenticated':
        return NextResponse.json({
          status: 'not_authenticated',
          message: 'Please log in'
        }, { status: 401 });

      default:
        console.error('Unknown RPC status:', result.status);
        return NextResponse.json({
          status: 'error',
          message: 'Something went wrong'
        }, { status: 500 });
    }

  } catch (error) {
    console.error('Secret phrase redemption API error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Something glitched in the Heartverse. Try again in a moment.'
    }, { status: 500 });
  }
}