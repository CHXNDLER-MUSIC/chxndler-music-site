import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/award-boost
 * Awards a boost to a user's active boosts
 *
 * Body: { userId: string, boostKey: string, scope: string, multiplier?: number, addAmount?: number, uses?: number }
 */
export async function POST(request: Request) {
  try {
    const { userId, boostKey, scope, multiplier = 2, addAmount = 0, uses = 1 } = await request.json();

    if (!userId || !boostKey || !scope) {
      return NextResponse.json(
        { error: 'Missing userId, boostKey, or scope' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = new Date();

    // Create user_active_boosts entry (no expiration for Element of Day boost - just 1 use)
    const { error: boostError } = await supabase
      .from('user_active_boosts')
      .insert({
        user_id: userId,
        boost_key: boostKey,
        scope: scope,
        multiplier: multiplier,
        add_amount: addAmount,
        uses_remaining: uses,
        starts_at: now.toISOString(),
        expires_at: null, // No expiration - just use count
      });

    if (boostError) {
      console.error('[award-boost API] Error inserting boost:', boostError);
      return NextResponse.json(
        { error: 'Error awarding boost', details: boostError.message },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV !== "production") console.log('[award-boost API] Boost awarded:', boostKey, 'scope:', scope, 'for user:', userId);

    return NextResponse.json({
      success: true,
      boostKey,
      scope,
      multiplier,
      addAmount,
      uses,
    });
  } catch (err: any) {
    console.error('[award-boost API] Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
