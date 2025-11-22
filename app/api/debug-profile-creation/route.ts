import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 DEBUG: Profile Creation Diagnostic Started');
    
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';
    
    if (!token) {
      console.log('❌ DEBUG: No access token found');
      return NextResponse.json({ 
        error: 'No authentication token found',
        debug: {
          cookiesPresent: Object.keys(Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value]))),
          tokenPresent: false
        }
      }, { status: 401 });
    }

    console.log('✅ DEBUG: Access token found, length:', token.length);
    
    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userResult?.user) {
      console.log('❌ DEBUG: User auth failed:', userError);
      return NextResponse.json({ 
        error: 'User authentication failed',
        debug: {
          userError: userError?.message,
          userPresent: !!userResult?.user
        }
      }, { status: 401 });
    }

    const user = userResult.user;
    console.log('✅ DEBUG: User authenticated:', user.id, user.email);

    // Check current profile status
    const supabaseAdmin = getSupabaseAdmin();
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log('📋 DEBUG: Profile check result:', {
      profileExists: !!existingProfile,
      profileCheckError: profileCheckError?.message,
      profileData: existingProfile
    });

    // Check auth.users table for email confirmation status
    const { data: authUser, error: authUserError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, email_confirmed_at, created_at, updated_at')
      .eq('id', user.id)
      .single();

    console.log('👤 DEBUG: Auth user data:', {
      authUserError: authUserError?.message,
      authUser: authUser
    });

    return NextResponse.json({
      success: true,
      debug: {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: !!user.email_confirmed_at
        },
        profile: {
          exists: !!existingProfile,
          data: existingProfile,
          checkError: profileCheckError?.message
        },
        authUser: {
          data: authUser,
          error: authUserError?.message
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('💥 DEBUG: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: {
        errorMessage: error.message,
        errorStack: error.stack
      }
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 DEBUG: Manual Profile Creation Started');
    
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value || '';
    
    if (!token) {
      return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
    }

    const supabase = createSupabaseServerClientWithJwt(token);
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userResult?.user) {
      return NextResponse.json({ error: 'User authentication failed' }, { status: 401 });
    }

    const user = userResult.user;
    console.log('✅ DEBUG: Creating profile for user:', user.id);

    const supabaseAdmin = getSupabaseAdmin();
    
    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      console.log('⚠️  DEBUG: Profile already exists');
      return NextResponse.json({ 
        message: 'Profile already exists',
        profileId: existingProfile.id 
      });
    }

    // Create profile
    const displayName = user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'Heartverse Wanderer';
    
    const profileData = {
      id: user.id,
      email: user.email,
      name: displayName,
      heart_coins_current: 0,
      heart_coins_total: 0,
      profile_complete: false,
      metadata: {
        source: 'debug_manual_creation',
        timestamp: new Date().toISOString(),
        created_from: 'debug_endpoint'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 DEBUG: Inserting profile data:', profileData);

    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    if (profileError) {
      console.error('❌ DEBUG: Profile creation failed:', profileError);
      return NextResponse.json({ 
        error: 'Profile creation failed',
        details: profileError
      }, { status: 500 });
    }

    console.log('✅ DEBUG: Profile created successfully:', newProfile);

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile: newProfile
    });

  } catch (error) {
    console.error('💥 DEBUG: Manual profile creation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}