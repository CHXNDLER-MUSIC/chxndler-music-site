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
      .select('id, code, label, kind')
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
        relicKind: relic.kind,
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

    // If this is a BOOST relic, create a user_active_boosts entry
    if (relic.kind?.toLowerCase() === 'boost') {
      // Map relic code to boost configuration
      const boostConfigMap: Record<string, { scope: string; multiplier: number; add_amount: number; uses: number }> = {
        'deep_focus': { scope: 'listen_rewards', multiplier: 2, add_amount: 0, uses: 1 },
        'reflection_boost': { scope: 'journal_rewards', multiplier: 2, add_amount: 0, uses: 1 },
        'streak_shield': { scope: 'streak_rewards', multiplier: 1, add_amount: 1, uses: 1 },
      };

      const boostConfig = boostConfigMap[relicCode.toLowerCase()];

      if (boostConfig) {
        // Calculate expiration (24 hours from now)
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Create user_active_boosts entry
        const { error: boostError } = await supabase
          .from('user_active_boosts')
          .insert({
            user_id: userId,
            boost_key: relicCode.toLowerCase(),
            scope: boostConfig.scope,
            multiplier: boostConfig.multiplier,
            add_amount: boostConfig.add_amount,
            uses_remaining: boostConfig.uses,
            starts_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          });

        if (boostError) {
          console.warn('[award-relic API] Could not create user_active_boosts:', boostError);
        } else {
          console.log('[award-relic API] Created user_active_boosts:', relicCode.toLowerCase(), 'for user:', userId);
        }
      }
    }

    console.log('[award-relic API] Relic awarded successfully:', relicCode, 'to user:', userId);

    return NextResponse.json({
      success: true,
      alreadyOwned: false,
      relicCode,
      relicLabel: relic.label,
      relicKind: relic.kind,
    });
  } catch (err: any) {
    console.error('[award-relic API] Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
