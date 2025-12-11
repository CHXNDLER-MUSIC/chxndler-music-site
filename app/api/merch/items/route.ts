import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Use service role key for public access to merch items
    // Merch items should be publicly viewable (purchasing requires auth)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get search params
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 'physical', 'digital', or null for all

    // Build query
    let query = supabase
      .from('merch_items')
      .select('*')
      .eq('is_active', true);

    // Filter by category if specified (temporarily disabled until schema is updated)
    // if (category && (category === 'physical' || category === 'digital')) {
    //   query = query.eq('category', category);
    // }

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

    console.log(`[MERCH_ITEMS] Retrieved ${items?.length || 0} active merch items`);

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