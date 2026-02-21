import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { itemId, itemTitle, priceUsd } = await request.json();

    if (!itemId || !itemTitle || !priceUsd) {
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

    // For now, we'll use the existing Stripe URLs from CoverHologram.tsx
    // In a full implementation, you'd create a dynamic Stripe session here
    
    // Map of item IDs to their Stripe purchase URLs
    const stripeUrls: Record<string, string> = {
      'baby': 'https://buy.stripe.com/aFacN64SZ4gZcZz8114gg0a',
      'ocean-girl': 'https://buy.stripe.com/dRmbJ24SZ00J6Bb9554gg00',
      'alone': 'https://buy.stripe.com/dRmfZiclr5l3e3Ddll4gg0i',
      'always-on-my-mind': 'https://buy.stripe.com/9B6cN61GN28R0cN5ST4gg04',
      'be-my-bee': 'https://buy.stripe.com/7sY9AU1GN00J4t3ftt4gg0l',
      'collide': 'https://buy.stripe.com/7sY3cw5X3fZH0cN0yz4gg05',
      'colors-of-our-home': 'https://buy.stripe.com/5kQ00k2KRfZH9Nn1CD4gg0j',
      'game-boy-heart': 'https://buy.stripe.com/aFa8wQ2KR5l32kV6WX4gg0m',
      'kid-forever': 'https://buy.stripe.com/00wfZibhnfZH4t3dll4gg0g',
      'letting-go': 'https://buy.stripe.com/3cI9AU85b00J9Nna994gg0d',
      'somebody-to-love': 'https://buy.stripe.com/4gM00kgBH4gZaRr1CD4gg0e',
      'tienes-un-amigo': 'https://buy.stripe.com/cNibJ2gBH3cV8Jjgxx4gg0f',
      'were-just-friends': 'https://buy.stripe.com/14A14o99fbJrbVv8114gg0b',
      // Add more mappings as needed
    };

    const stripeUrl = stripeUrls[itemId];
    
    if (!stripeUrl) {
      return NextResponse.json(
        { error: 'Item not available for purchase' },
        { status: 404 }
      );
    }

    // Log the purchase attempt for analytics
    try {
      await supabase.from('purchase_attempts').insert({
        user_id: user.id,
        item_id: itemId,
        item_title: itemTitle,
        price_usd: priceUsd,
        payment_method: 'stripe',
        stripe_url: stripeUrl,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      if (process.env.NODE_ENV !== "production") console.warn('Failed to log purchase attempt:', logError);
    }

    return NextResponse.json({
      url: stripeUrl,
      itemId,
      itemTitle,
      priceUsd
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}