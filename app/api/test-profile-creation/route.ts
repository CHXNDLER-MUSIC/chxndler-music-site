import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Get all profiles to see current state
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (profilesError) {
      return NextResponse.json({ 
        error: 'Failed to fetch profiles', 
        details: profilesError.message 
      }, { status: 500 });
    }

    // Get all auth users for comparison
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      return NextResponse.json({ 
        error: 'Failed to fetch auth users', 
        details: authError.message 
      }, { status: 500 });
    }

    // Check which users have profiles and which don't
    const usersWithoutProfiles = authUsers.users.filter(user => 
      !profiles.some(profile => profile.id === user.id)
    );

    return NextResponse.json({
      profiles: profiles,
      totalAuthUsers: authUsers.users.length,
      totalProfiles: profiles.length,
      usersWithoutProfiles: usersWithoutProfiles.map(user => ({
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at
      })),
      message: `Found ${profiles.length} profiles for ${authUsers.users.length} auth users`
    });

  } catch (error: any) {
    console.error('Profile test error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// Test endpoint to manually create a profile for a user
export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json();
    
    if (!userId || !email) {
      return NextResponse.json({ 
        error: 'userId and email are required' 
      }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
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

    // Create new profile
    const { data: newProfile, error } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: userId,
        email: email,
        display_name: email,
        heartcoin_balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to create profile',
        details: error.message 
      }, { status: 500 });
    }

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