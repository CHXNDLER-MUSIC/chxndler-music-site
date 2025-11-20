import { NextResponse, NextRequest } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, email, journey = 'wanderer', heart_coins_current = 0, heart_coins_total = 0, profile_complete = false } = body;

    if (!phone && !email) {
      return NextResponse.json({ error: 'Phone number or email is required' }, { status: 400 });
    }

    // Check if profile already exists
    let existingProfile;
    if (phone) {
      const { data: phoneCheck } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .single();
      existingProfile = phoneCheck;
    }

    if (!existingProfile && email) {
      const { data: emailCheck } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      existingProfile = emailCheck;
    }

    if (existingProfile) {
      return NextResponse.json({ 
        message: 'Profile already exists', 
        profile: existingProfile 
      }, { status: 200 });
    }

    // Create new profile
    const { data: newProfile, error } = await supabaseClient
      .from('profiles')
      .insert([{
        phone,
        email,
        journey,
        heart_coins_current,
        heart_coins_total,
        profile_complete
      }])
      .select()
      .single();

    if (error) {
      console.error('Profile creation error:', error);
      return NextResponse.json({ 
        error: 'Failed to create profile',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Profile created successfully',
      profile: newProfile 
    }, { status: 201 });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}