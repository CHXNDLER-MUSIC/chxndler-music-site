import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';
import { PollService } from '@/lib/pollService';
import { VoteRequest, VoteResponse, ElementType } from '@/types/poll';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'UNAUTHORIZED' 
      } as VoteResponse, { status: 401 });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userResult?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'UNAUTHORIZED' 
      } as VoteResponse, { status: 401 });
    }

    const user = userResult.user;
    const body = await req.json() as VoteRequest;
    const { pollId, songId, element } = body;

    // Validate request body
    if (!pollId || !songId || !element) {
      return NextResponse.json({ 
        success: false, 
        error: 'INVALID_REQUEST' 
      } as VoteResponse, { status: 400 });
    }

    // Validate element type
    if (!(['HEART', 'WATER', 'LIGHTNING', 'DARKNESS'] as ElementType[]).includes(element)) {
      return NextResponse.json({ 
        success: false, 
        error: 'INVALID_SONG' 
      } as VoteResponse, { status: 400 });
    }

    const pollService = new PollService(supabase);
    
    // Get active poll and validate song selection
    const activePoll = await pollService.getActivePoll();
    if (!activePoll) {
      return NextResponse.json({ 
        success: false, 
        error: 'INVALID_POLL' 
      } as VoteResponse, { status: 400 });
    }

    if (activePoll.id !== pollId) {
      return NextResponse.json({ 
        success: false, 
        error: 'INVALID_POLL' 
      } as VoteResponse, { status: 400 });
    }

    // Validate that the songId matches the element option
    if (!pollService.validateSongOption(activePoll, songId, element)) {
      return NextResponse.json({ 
        success: false, 
        error: 'INVALID_SONG' 
      } as VoteResponse, { status: 400 });
    }

    // Cast the vote using RPC function
    try {
      await pollService.castVoteWithHeartcoin({
        p_poll_id: pollId,
        p_user_id: user.id,
        p_song_id: songId,
        p_element: element
      });

      // Get updated results
      const results = await pollService.getPollResults(pollId);

      return NextResponse.json({
        success: true,
        results
      } as VoteResponse);

    } catch (error: any) {
      const errorMessage = error.message;
      
      if (errorMessage === 'ALREADY_VOTED') {
        return NextResponse.json({ 
          success: false, 
          error: 'ALREADY_VOTED' 
        } as VoteResponse, { status: 409 });
      }
      
      if (errorMessage === 'INSUFFICIENT_HEARTCOINS') {
        return NextResponse.json({ 
          success: false, 
          error: 'INSUFFICIENT_HEARTCOINS' 
        } as VoteResponse, { status: 402 });
      }
      
      throw error;
    }

  } catch (error: any) {
    console.error('Vote API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'INTERNAL_ERROR' 
    } as VoteResponse, { status: 500 });
  }
}