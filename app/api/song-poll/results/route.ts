import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseServerClientWithJwt, getSupabaseAdmin } from '@/lib/supabaseServer';
import { PollService } from '@/lib/pollService';
import { PollResults } from '@/types/poll';

// Prevent static prerendering - this route requires runtime env vars
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Use admin client to get poll results (no auth required for viewing results)
    const supabase = getSupabaseAdmin();
    const pollService = new PollService(supabase);
    
    // Get the active poll
    const activePoll = await pollService.getActivePoll();
    if (!activePoll) {
      return NextResponse.json({ 
        error: 'No active poll found' 
      }, { status: 404 });
    }

    // Get poll results with vote counts
    const results = await pollService.getPollResults(activePoll.id);
    
    // Optionally get song titles if we have songs table
    // For now we'll return the results with songIds and let the frontend handle titles
    const enrichedResults: PollResults = {
      ...results,
      options: {
        heart: { ...results.options.heart, title: `Song ${results.options.heart.songId.slice(-4)}` },
        water: { ...results.options.water, title: `Song ${results.options.water.songId.slice(-4)}` },
        lightning: { ...results.options.lightning, title: `Song ${results.options.lightning.songId.slice(-4)}` },
        darkness: { ...results.options.darkness, title: `Song ${results.options.darkness.songId.slice(-4)}` }
      }
    };

    return NextResponse.json(enrichedResults);

  } catch (error: any) {
    console.error('Poll results API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch poll results',
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Allow authenticated users to get poll results with their voting status
    const { searchParams } = new URL(req.url);
    const includUserVote = searchParams.get('includeUserVote') === 'true';
    
    if (!includUserVote) {
      return GET(req);
    }

    const cookieStore = await req.headers.get('cookie');
    if (!cookieStore) {
      return GET(req);
    }

    // Extract token manually from cookie header
    const cookies = cookieStore.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const token = cookies['sb-access-token'];
    if (!token) {
      return GET(req);
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userResult?.user) {
      return GET(req);
    }

    const user = userResult.user;
    const adminSupabase = getSupabaseAdmin();
    const pollService = new PollService(adminSupabase);
    
    // Get the active poll
    const activePoll = await pollService.getActivePoll();
    if (!activePoll) {
      return NextResponse.json({ 
        error: 'No active poll found' 
      }, { status: 404 });
    }

    // Get poll results
    const results = await pollService.getPollResults(activePoll.id);
    
    // Check if user has already voted
    const { data: userVote } = await adminSupabase
      .from('song_poll_votes')
      .select('song_id, element')
      .eq('poll_id', activePoll.id)
      .eq('user_id', user.id)
      .single();

    const enrichedResults = {
      ...results,
      options: {
        heart: { ...results.options.heart, title: `Song ${results.options.heart.songId.slice(-4)}` },
        water: { ...results.options.water, title: `Song ${results.options.water.songId.slice(-4)}` },
        lightning: { ...results.options.lightning, title: `Song ${results.options.lightning.songId.slice(-4)}` },
        darkness: { ...results.options.darkness, title: `Song ${results.options.darkness.songId.slice(-4)}` }
      },
      userVote: userVote ? {
        songId: userVote.song_id,
        element: userVote.element
      } : null
    };

    return NextResponse.json(enrichedResults);

  } catch (error: any) {
    console.error('Poll results API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch poll results',
      details: error.message 
    }, { status: 500 });
  }
}