import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    // Get the current user
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get user's profile from database
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('element')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error getting profile element:', error);
      return NextResponse.json(
        { error: 'Failed to get selected element' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ selected_element: profile?.element || null });
  } catch (error) {
    console.error('Error getting selected element:', error);
    return NextResponse.json(
      { error: 'Failed to get selected element' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { selected_element } = body;
    
    // Validate element
    const validElements = ['water', 'heart', 'lightning', 'darkness'];
    if (!validElements.includes(selected_element)) {
      return NextResponse.json(
        { error: 'Invalid element' },
        { status: 400 }
      );
    }
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Update user's element in the profiles table (do NOT send updated_at)
    const { data, error } = await supabaseClient
      .from('profiles')
      .update({
        element: selected_element
      })
      .eq('id', session.user.id)
      .select('*')
      .maybeSingle();
    
    if (error) {
      console.error('Error updating profile element:', error);
      return NextResponse.json(
        { error: 'Failed to save selected element' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      selected_element,
      profile: data
    });
  } catch (error) {
    console.error('Error saving selected element:', error);
    return NextResponse.json(
      { error: 'Failed to save selected element' },
      { status: 500 }
    );
  }
}