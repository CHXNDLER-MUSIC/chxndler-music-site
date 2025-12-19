import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { logHeartcoinTransaction } from '@/utils/heartcoins';

export async function POST(req: NextRequest) {
  try {
    const { userEmail } = await req.json();
    
    if (!userEmail) {
      return NextResponse.json({ error: 'userEmail is required' }, { status: 400 });
    }

    console.log('🧪 Testing auth callback profile creation for:', userEmail);

    const admin = getSupabaseAdmin();
    
    // Find the user by email in auth.users
    const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();
    if (authError) {
      return NextResponse.json({ error: 'Failed to get auth users', details: authError }, { status: 500 });
    }

    const user = authUsers.users.find(u => u.email === userEmail);
    if (!user) {
      return NextResponse.json({ error: 'User not found in auth.users' }, { status: 404 });
    }

    console.log('🧪 Found auth user:', user.id, user.email);

    // Check if profile already exists
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, email, name, heartcoin_balance')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      return NextResponse.json({ 
        message: 'Profile already exists',
        profile: existingProfile
      });
    }

    console.log('🧪 Creating new profile for user:', user.id);
    
    // Create profile (same logic as auth callback)
    const displayName = user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'Heartverse Wanderer';
    
    const { data: newProfile, error: profileError } = await admin
      .from('profiles')
      .insert([{
        id: user.id,
        email: user.email,
        name: displayName,
        profile_complete: false,
        metadata: {
          source: 'welcome_home_modal',
          timestamp: new Date().toISOString(),
          created_from: 'test_auth_callback'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (profileError) {
      console.error('🧪 Profile creation failed:', profileError);
      return NextResponse.json({ 
        error: 'Failed to create profile',
        details: profileError 
      }, { status: 500 });
    }

    console.log('🧪 Profile created successfully:', newProfile);
    // Award welcome bonus via transaction insert
    try {
      await logHeartcoinTransaction(admin as any, {
        user_id: user.id,
        amount: 5,
        reason: 'WELCOME_BONUS',
        description: 'Welcome bonus heart coins',
        transaction_type: 'bonus',
        metadata: { source: 'welcome_home_modal' }
      });
    } catch (txErr) {
      console.error('🧪 Failed to insert welcome bonus transaction:', txErr);
    }
    
    return NextResponse.json({ 
      message: 'Profile created successfully via test',
      profile: newProfile 
    });

  } catch (error: any) {
    console.error('🧪 Test auth callback error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
