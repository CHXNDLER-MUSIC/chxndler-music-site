import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
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

    // Get search params
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 'physical', 'digital', or null for all

    // Build query
    let query = supabase
      .from('merch_items')
      .select('*')
      .eq('is_active', true);

    // Filter by category if specified
    if (category && (category === 'physical' || category === 'digital')) {
      query = query.eq('category', category);
    }

    // Order by name for consistent display
    query = query.order('name');

    const { data: items, error: fetchError } = await query;

    if (fetchError) {
      console.error('[MERCH_ITEMS] Error fetching items:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch merchandise items' },
        { status: 500 }
      );
    }

    console.log(`[MERCH_ITEMS] Retrieved ${items?.length || 0} items for user ${user.id}`);

    return NextResponse.json({
      success: true,
      data: items || [],
      count: items?.length || 0
    });

  } catch (error) {
    console.error('[MERCH_ITEMS] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}