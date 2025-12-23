import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

/**
 * Physical card purchase API
 * - Checks user's heartcoin_balance
 * - Deducts cost from heartcoin_balance
 * - Creates order with requires_shipping=true, shipping_submitted=false
 * - Logs heartcoin transaction (non-blocking)
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

    // Create Supabase client with service role (bypasses RLS for admin operations)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Decode user ID from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 1. Get card info and validate it's available for physical purchase
    // Uses actual schema columns: physical_cost_heartcoins, is_physical_available, is_released
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, card_name, physical_cost_heartcoins, is_physical_available, is_released')
      .eq('id', cardId)
      .eq('is_released', true)
      .eq('is_physical_available', true)
      .single();

    if (cardError || !card) {
      console.error('[CARD PURCHASE] Card lookup failed:', cardError);
      return NextResponse.json(
        { success: false, error: 'Card not found or not available for physical purchase' },
        { status: 404 }
      );
    }

    // Default to 20 HeartCoins if not set
    const cost = card.physical_cost_heartcoins ?? 20;

    // 2. Get user's current heartcoin_balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('heartcoin_balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    const currentBalance = profile.heartcoin_balance ?? 0;

    // 3. Guard: Check if user has sufficient heartcoin_balance BEFORE inserting order
    if (currentBalance < cost) {
      return NextResponse.json(
        { success: false, error: `Insufficient HeartCoins: have ${currentBalance}, need ${cost}` },
        { status: 400 }
      );
    }

    const newBalance = currentBalance - cost;

    // 4. Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_type: 'physical_card',
        payment_type: 'heartcoins',
        item_id: `${card.card_name}_physical`,
        item_name: `${card.card_name} (Physical Card)`,
        card_id: cardId,
        quantity: 1,
        total_heartcoins: cost,
        status: 'pending_shipping',
        requires_shipping: true,
        shipping_submitted: false,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('[CARD PURCHASE] Order creation failed:', orderError);
      return NextResponse.json(
        { success: false, error: 'Failed to create order' },
        { status: 500 }
      );
    }

    const orderId = order.id;

    // 5. Deduct from heartcoin_balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ heartcoin_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('[CARD PURCHASE] Balance update failed:', updateError);
      // Attempt to delete the order since balance update failed
      await supabase.from('orders').delete().eq('id', orderId);
      return NextResponse.json(
        { success: false, error: 'Failed to update balance' },
        { status: 500 }
      );
    }

    // 6. Log heartcoin transaction (non-blocking - don't fail purchase if this fails)
    try {
      await supabase.from('heartcoin_transactions').insert({
        user_id: userId,
        amount: -cost,
        transaction_type: 'purchase',
        description: `Purchased physical card: ${card.card_name}`,
        metadata: {
          order_id: orderId,
          card_id: cardId,
          card_name: card.card_name,
          purchase_type: 'physical_card',
          total_cost: cost,
        },
      });
    } catch (txError) {
      // Log but don't fail the purchase
      console.error('[CARD PURCHASE] Transaction logging failed (non-fatal):', txError);
    }

    // Return response with keys that match frontend expectations
    return NextResponse.json({
      success: true,
      orderId,
      newBalance,
      cost,
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
