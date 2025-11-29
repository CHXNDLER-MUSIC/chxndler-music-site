import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

/**
 * Admin endpoint to toggle live streaming status for testing
 * In production, this should be protected with proper authentication
 */
export async function POST(request: NextRequest) {
  try {
    // In production, add proper admin authentication here
    // For now, we'll allow any authenticated user to toggle for testing
    
    // Get current live status
    const { data: currentProfile, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('twitch_live_status')
      .eq('email', 'chxndlerthealien@gmail.com') // Replace with your email
      .single();

    if (fetchError) {
      console.error('Error fetching current status:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch current status' },
        { status: 500 }
      );
    }

    // Toggle the status
    const newStatus = !currentProfile.twitch_live_status;

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ twitch_live_status: newStatus })
      .eq('email', 'chxndlerthealien@gmail.com');

    if (updateError) {
      console.error('Error updating live status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update live status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isLive: newStatus,
      message: `Live status ${newStatus ? 'enabled' : 'disabled'}`
    });

  } catch (error) {
    console.error('Error in toggle-live-status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also allow GET to check current status
export async function GET(request: NextRequest) {
  try {
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('twitch_live_status')
      .eq('email', 'chxndlerthealien@gmail.com')
      .single();

    if (error) {
      console.error('Error fetching live status:', error);
      return NextResponse.json(
        { error: 'Failed to fetch live status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      isLive: profile?.twitch_live_status || false
    });

  } catch (error) {
    console.error('Error in get live status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}