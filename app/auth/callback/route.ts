import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';

export async function GET(req: Request) {
  console.log('🚨 AUTH CALLBACK HIT! 🚨');
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  // Log for debugging
  console.log('Auth callback - URL params:', Object.fromEntries(url.searchParams.entries()));
  console.log('Auth callback - Code present:', !!code);
  console.log('Auth callback - Full URL:', req.url);

  if (!code) {
    console.log('Auth callback - No code present, redirecting to home');
    return NextResponse.redirect(new URL('/', req.url));
  }

  console.log('Auth callback - Processing auth code...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !anonKey) {
    console.log('Auth callback - Missing environment variables');
    return NextResponse.redirect(new URL('/?error=missing-env', req.url));
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession({ authCode: code });
    if (error || !data.session || !data.user) {
      console.log('Auth callback - Exchange failed:', error);
      return NextResponse.redirect(new URL('/?error=exchange_failed', req.url));
    }

    const accessToken = data.session.access_token;
    const refreshToken = data.session.refresh_token;
    const email = data.user.email;

    console.log('🎉 AUTH SUCCESS! User:', data.user.id, 'Email:', email);

    // Set auth cookies
    const res = NextResponse.redirect(new URL('/?auth=success', req.url));
    console.log('Auth callback - Redirecting to home with success flag');
    
    const secure = process.env.NODE_ENV === 'production';
    res.cookies.set('sb-access-token', accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.set('sb-refresh-token', refreshToken ?? '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    // Create profile if it doesn't exist
    try {
      const supabaseAdmin = getSupabaseAdmin();
      
      // Check if profile already exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, display_name, heartcoin_balance')
        .eq('id', data.user.id)
        .single();

      if (!existingProfile) {
        console.log('Auth callback - Creating new profile for user:', data.user.id);
        
        // Determine display name
        const displayName = data.user.user_metadata?.full_name || 
                          data.user.user_metadata?.name || 
                          email?.split('@')[0] || 
                          'Heartverse Wanderer';
        
        console.log('Auth callback - About to insert profile with data:', {
          id: data.user.id,
          email: email,
          display_name: displayName,
          heartcoin_balance: 5
        });
        
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert([{
            id: data.user.id,
            email: email,
            display_name: displayName,
            heartcoin_balance: 5, // Welcome bonus heart coins
            heartcoin_total: 5,   // Also set total
            profile_complete: false,
            metadata: {
              source: 'welcome_home_modal',
              timestamp: new Date().toISOString(),
              created_from: 'auth_callback'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (profileError) {
          console.error('Auth callback - Profile creation failed:', profileError);
          console.error('Profile error details:', profileError.details, profileError.hint, profileError.code);
        } else {
          console.log('Auth callback - Profile created successfully with welcome bonus:', newProfile);
        }
      } else {
        console.log('Auth callback - Profile already exists for user:', data.user.id);
        
        // Update profile with latest email if it's missing
        if (!existingProfile.email && email) {
          await supabaseAdmin
            .from('profiles')
            .update({ 
              email: email,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.user.id);
          console.log('Auth callback - Updated profile with email:', email);
        }
      }
    } catch (profileError) {
      console.error('Auth callback - Error handling profile creation:', profileError);
      // Don't fail the auth flow if profile creation fails
    }

    return res;
    
  } catch (error) {
    console.error('Auth callback - Unexpected error:', error);
    return NextResponse.redirect(new URL('/?error=unexpected', req.url));
  }
}
