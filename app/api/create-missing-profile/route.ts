import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function POST() {
  try {
    const admin = getSupabaseAdmin();
    
    // Get the user who doesn't have a profile yet
    const userEmail = 'producer@callyourbubby.com';
    const userId = '2ea5bac2-344d-49da-924b-1d03f845f9e5';
    
    console.log('Creating missing profile for user:', userId, userEmail);
    
    // Check if profile already exists
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return NextResponse.json({ 
        message: 'Profile already exists',
        profile: existingProfile
      });
    }

    // Create the profile
    const { data: newProfile, error: profileError } = await admin
      .from('profiles')
      .insert([{
        id: userId,
        email: userEmail,
        display_name: userEmail.split('@')[0],
        heartcoin_balance: 5, // Welcome bonus heart coins
        heartcoin_total: 5,   // Also set total
        profile_complete: false,
        metadata: {
          source: 'welcome_home_modal',
          timestamp: new Date().toISOString(),
          created_from: 'manual_creation'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (profileError) {
      console.error('Manual profile creation failed:', profileError);
      return NextResponse.json({ 
        error: 'Failed to create profile',
        details: profileError 
      }, { status: 500 });
    }

    console.log('Manual profile created successfully:', newProfile);
    
    return NextResponse.json({ 
      message: 'Profile created successfully',
      profile: newProfile 
    });

  } catch (error: any) {
    console.error('Manual profile creation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}