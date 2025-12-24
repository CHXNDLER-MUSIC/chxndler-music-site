import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

/**
 * Physical card purchase API
 * - Calls purchase_physical_card RPC which handles atomically:
 *   - Balance check and deduction
 *   - Order creation
 *   - Transaction logging
 * - Shipping info is added in step 2 via /api/cards/updateShipping
 */

// Helper: Extract access token from Supabase auth cookies
// Supabase uses project-prefixed cookie names like sb-{ref}-auth-token
function extractAccessToken(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
  const allCookies = cookieStore.getAll();

  // Look for any cookie that matches Supabase auth pattern
  // Pattern: sb-{project-ref}-auth-token (stores JSON with access_token)
  for (const cookie of allCookies) {
    if (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) {
      try {
        const parsed = JSON.parse(cookie.value);
        if (parsed?.access_token) {
          return parsed.access_token;
        }
      } catch {
        // Not valid JSON, skip
      }
    }
  }

  // Fallback: look for raw sb-access-token (legacy/simple setup)
  const legacyToken = cookieStore.get('sb-access-token')?.value;
  if (legacyToken) {
    return legacyToken;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Read cookies and extract auth token
    const cookieStore = await cookies();
    const token = extractAccessToken(cookieStore);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const { cardId } = await request.json();

    if (!cardId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: cardId' },
        { status: 400 }
      );
    }

    // Create Supabase client with user's token so auth.uid() works in RPC
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Fetch the card to get its physical price
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, card_name, price_heartcoins_physical, is_physical')
      .eq('id', cardId)
      .single();

    if (cardError || !card) {
      console.error('[CARD PURCHASE] Card fetch error:', cardError);
      return NextResponse.json(
        { success: false, error: 'Card not found' },
        { status: 404 }
      );
    }

    if (!card.is_physical) {
      return NextResponse.json(
        { success: false, error: 'This card is not available for physical purchase' },
        { status: 400 }
      );
    }

    const cost = card.price_heartcoins_physical ?? 15;

    // Fetch user's current heartcoin_balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('heartcoin_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[CARD PURCHASE] Profile fetch error:', profileError);
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    const currentBalance = profile.heartcoin_balance ?? 0;

    // Check if user has sufficient heartcoin_balance
    if (currentBalance < cost) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient HeartCoins! You need ${cost} but only have ${currentBalance}`,
          required: cost,
          available: currentBalance
        },
        { status: 400 }
      );
    }

    // Call the RPC function to handle purchase atomically
    // RPC uses auth.uid() internally to identify the user
    const { data: orderId, error: rpcError } = await supabase.rpc('purchase_physical_card', {
      p_card_id: cardId,
    });

    if (rpcError) {
      console.error('[CARD PURCHASE] RPC error:', rpcError);
      return NextResponse.json(
        { success: false, error: rpcError.message },
        { status: 400 }
      );
    }

    // Calculate new balance after deduction
    const newBalance = currentBalance - cost;

    // Return response with keys that match frontend expectations
    return NextResponse.json({
      success: true,
      orderId: orderId,
      newBalance: newBalance,
      new_balance: newBalance, // Keep for backward compatibility
    });

  } catch (error) {
    console.error('[CARD PURCHASE] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
