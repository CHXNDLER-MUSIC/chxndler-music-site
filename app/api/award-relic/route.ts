import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/award-relic
 * Awards a relic to a user's collection
 *
 * Body: { userId: string, relicCode: string }
 */
export async function POST(request: Request) {
  try {
    const { userId, relicCode } = await request.json();

    if (!userId || !relicCode) {
      return NextResponse.json(
        { error: 'Missing userId or relicCode' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Find the relic by code
    const { data: relic, error: relicError } = await supabase
      .from('relics')
      .select('id, code, label')
      .eq('code', relicCode)
      .maybeSingle();

    if (relicError) {
      console.error('[award-relic API] Error finding relic:', relicError);
      return NextResponse.json(
        { error: 'Error finding relic', details: relicError.message },
        { status: 500 }
      );
    }

    if (!relic) {
      console.error('[award-relic API] Relic not found:', relicCode);
      return NextResponse.json(
        { error: 'Relic not found', relicCode },
        { status: 404 }
      );
    }

    // Check if user already owns this relic
    const { data: existingRelic, error: checkError } = await supabase
      .from('user_relics')
      .select('id')
      .eq('user_id', userId)
      .eq('relic_id', relic.id)
      .maybeSingle();

    if (checkError) {
      console.error('[award-relic API] Error checking existing relic:', checkError);
      return NextResponse.json(
        { error: 'Error checking existing relic', details: checkError.message },
        { status: 500 }
      );
    }

    if (existingRelic) {
      console.log('[award-relic API] User already owns relic:', relicCode);
      return NextResponse.json({
        success: true,
        alreadyOwned: true,
        relicCode,
        relicLabel: relic.label,
      });
    }

    // Award the relic to the user
    const { error: insertError } = await supabase
      .from('user_relics')
      .insert({
        user_id: userId,
        relic_id: relic.id,
      });

    if (insertError) {
      console.error('[award-relic API] Error awarding relic:', insertError);
      return NextResponse.json(
        { error: 'Error awarding relic', details: insertError.message },
        { status: 500 }
      );
    }

    // Update relics_unlocked_count in profiles
    const { error: updateError } = await supabase.rpc('increment_relics_count', {
      p_user_id: userId
    }).catch(() => {
      // If RPC doesn't exist, try direct update
      return supabase
        .from('profiles')
        .update({ relics_unlocked_count: supabase.rpc('coalesce', { val: 'relics_unlocked_count', default_val: 0 }) })
        .eq('id', userId);
    });

    // Ignore update error - the main thing is the relic was awarded
    if (updateError) {
      console.warn('[award-relic API] Could not update relics count:', updateError);
    }

    console.log('[award-relic API] Relic awarded successfully:', relicCode, 'to user:', userId);

    return NextResponse.json({
      success: true,
      alreadyOwned: false,
      relicCode,
      relicLabel: relic.label,
    });
  } catch (err: any) {
    console.error('[award-relic API] Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
