import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

// Helper function to award a relic to a user
async function awardRelicToUser(admin: ReturnType<typeof getSupabaseAdmin>, userId: string, relicCode: string) {
  try {
    // Find the relic by code
    const { data: relic, error: relicError } = await admin
      .from('relics')
      .select('id, code, label')
      .eq('code', relicCode)
      .maybeSingle();

    if (relicError || !relic) {
      console.log(`[submit-phone] Relic '${relicCode}' not found, skipping award`);
      return { awarded: false, alreadyOwned: false };
    }

    // Check if user already owns this relic
    const { data: existingRelic } = await admin
      .from('user_relics')
      .select('id')
      .eq('user_id', userId)
      .eq('relic_id', relic.id)
      .maybeSingle();

    if (existingRelic) {
      console.log(`[submit-phone] User ${userId} already owns relic '${relicCode}'`);
      return { awarded: false, alreadyOwned: true, relicLabel: relic.label };
    }

    // Award the relic
    const { error: insertError } = await admin
      .from('user_relics')
      .insert({
        user_id: userId,
        relic_id: relic.id,
      });

    if (insertError) {
      console.error(`[submit-phone] Error awarding relic '${relicCode}':`, insertError);
      return { awarded: false, alreadyOwned: false };
    }

    // Update relics_unlocked_count in profiles
    await admin.rpc('increment_relics_count', { p_user_id: userId }).catch(() => {
      // If RPC doesn't exist, just log it
      console.log('[submit-phone] Could not increment relics count via RPC');
    });

    console.log(`[submit-phone] Awarded relic '${relicCode}' to user ${userId}`);
    return { awarded: true, alreadyOwned: false, relicLabel: relic.label };
  } catch (err) {
    console.error(`[submit-phone] Unexpected error awarding relic:`, err);
    return { awarded: false, alreadyOwned: false };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' }, 
        { status: 400 }
      );
    }

    // Clean phone number (remove any non-digit characters except + at the start)
    const cleanPhone = phone.trim();
    
    // Get admin client for database operations
    const admin = getSupabaseAdmin();
    
    // Check if user is authenticated
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    let userId: string | null = null;
    
    if (token) {
      try {
        const supabase = createSupabaseServerClientWithJwt(token);
        const { data: userResult, error: userError } = await supabase.auth.getUser();
        
        if (!userError && userResult?.user) {
          userId = userResult.user.id;
        }
      } catch (e) {
        console.log('Auth check failed, treating as anonymous');
      }
    }

    if (userId) {
      // User is authenticated - check if they have a profile and update it
      const { data: existingProfile, error: profileError } = await admin
        .from('profiles')
        .select('id, phone')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileError);
        throw profileError;
      }

      if (existingProfile) {
        // Update existing profile with phone number (do NOT send updated_at)
        const { error: updateError } = await admin
          .from('profiles')
          .update({
            phone: cleanPhone
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating profile phone:', updateError);
          throw updateError;
        }

        return NextResponse.json({
          success: true,
          message: 'Phone number updated in your profile!',
          type: 'profile_updated'
        });
      } else {
        // Create new profile for authenticated user
        const { error: insertError } = await admin
          .from('profiles')
          .insert({
            id: userId,
            phone: cleanPhone,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw insertError;
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Profile created with your phone number!',
          type: 'profile_created'
        });
      }
    } else {
      // User is not authenticated - save to signal_signups table
      const { error: signupError } = await admin
        .from('signal_signups')
        .insert({
          phone: cleanPhone,
          created_at: new Date().toISOString()
        });

      if (signupError) {
        console.error('Error saving to signal_signups:', signupError);
        throw signupError;
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Phone number saved! You\'re connected to the Heartverse.',
        type: 'signal_signup'
      });
    }

  } catch (error: any) {
    console.error('Submit phone error:', error);
    
    // Handle unique constraint violations
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'This phone number is already connected to the Heartverse!' }, 
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to save phone number. Please try again.' }, 
      { status: 500 }
    );
  }
}