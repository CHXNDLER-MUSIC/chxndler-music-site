import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET - Fetch user's physical orders (with optional latest=true query param)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const latest = searchParams.get('latest') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Verify the requesting user matches the user_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase
      .from('physical_card_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (latest) {
      query = query.limit(1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching physical orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    if (latest) {
      return NextResponse.json(data?.[0] || null);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/physical-orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new physical order
export async function POST(request: Request) {
  try {
    const orderData = await request.json();

    const supabase = createRouteHandlerClient({ cookies });

    // Verify the user is authenticated and matches the user_id in the order
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== orderData.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate required fields
    const requiredFields = [
      'user_id', 'card_key', 'full_name', 'address_line1', 
      'city', 'state', 'postal_code', 'cost_heartcoins'
    ];

    for (const field of requiredFields) {
      if (!orderData[field]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 });
      }
    }

    // Insert the order
    const { data, error } = await supabase
      .from('physical_card_orders')
      .insert([orderData])
      .select()
      .single();

    if (error) {
      console.error('Error creating physical order:', error);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/physical-orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}