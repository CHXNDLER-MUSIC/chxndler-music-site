import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/public-badges?userId=xxx
 * Fetches badges for any user (bypasses RLS for public badge display)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Fetch user's badges with badge details
    const { data: userBadges, error: badgesError } = await supabase
      .from('user_badges')
      .select(`
        id,
        badge_id,
        earned_at,
        awarded_at,
        badges (
          id,
          slug,
          badge_name,
          icon_url,
          description,
          category,
          requirement_type,
          requirement_count
        )
      `)
      .eq('user_id', userId);

    if (badgesError) {
      console.error('Error fetching user badges:', badgesError);
      return NextResponse.json({
        error: 'Failed to fetch badges',
        badges: []
      }, { status: 200 }); // Return 200 with empty array for graceful degradation
    }

    return NextResponse.json({
      badges: userBadges || []
    }, { status: 200 });

  } catch (error: any) {
    console.error('API error fetching public badges:', error);
    return NextResponse.json({
      error: 'Internal server error',
      badges: []
    }, { status: 200 }); // Return 200 with empty array for graceful degradation
  }
}
