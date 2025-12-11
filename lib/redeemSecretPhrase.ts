import { SupabaseClient } from '@supabase/supabase-js';

type RedeemSecretPhraseArgs = {
  supabase: SupabaseClient;
  userId: string;
  context: string;   // 'twitch', 'live_show', 'global' etc
  phrase: string;    // what the user typed
};

type RedeemSecretPhraseResult =
  | {
      status: 'success';
      message: string;
      rewardHeartCoins: number;
      newHeartsBalance?: number;
      newHeartcoinBalance?: number;
    }
  | {
      status: 'error';
      code: 'NO_ACTIVE_PHRASE' | 'ALREADY_REDEEMED' | 'INVALID_INPUT' | 'INTERNAL_ERROR';
      message: string;
    };

export async function redeemSecretPhrase({
  supabase,
  userId,
  context,
  phrase
}: RedeemSecretPhraseArgs): Promise<RedeemSecretPhraseResult> {
  try {
    // Validate input
    const trimmedPhrase = phrase.trim();
    if (!trimmedPhrase || !context || !userId) {
      return {
        status: 'error',
        code: 'INVALID_INPUT',
        message: 'Missing required fields'
      };
    }

    const now = new Date().toISOString();

    // Query for active secret phrases
    // Note: current schema doesn't have context column, so we'll match any active phrase
    const today = now.split('T')[0]; // Get YYYY-MM-DD format
    const { data: phrases, error: phrasesError } = await supabase
      .from('secret_phrases')
      .select('*')
      .eq('secret_phrase', trimmedPhrase.toLowerCase())
      .eq('active_date', today)
      .eq('is_active', true);

    if (phrasesError) {
      console.error('Error fetching secret phrases:', phrasesError);
      return {
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to check secret phrases'
      };
    }

    if (!phrases || phrases.length === 0) {
      return {
        status: 'error',
        code: 'NO_ACTIVE_PHRASE',
        message: 'That signal is not active right now.'
      };
    }

    // Take the first phrase (preference for context-specific due to ordering)
    const activePhrase = phrases[0];

    // Check if already redeemed
    const { data: existingRedemption, error: redemptionError } = await supabase
      .from('secret_phrase_redemptions')
      .select('id')
      .eq('user_id', userId)
      .eq('secret_phrase_id', activePhrase.id)
      .single();

    if (redemptionError && redemptionError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error checking redemption:', redemptionError);
      return {
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify redemption status'
      };
    }

    if (existingRedemption) {
      return {
        status: 'error',
        code: 'ALREADY_REDEEMED',
        message: 'You have already redeemed this signal.'
      };
    }

    // Start transaction-like operation
    // 1. Insert redemption record
    const { error: insertError } = await supabase
      .from('secret_phrase_redemptions')
      .insert({
        user_id: userId,
        secret_phrase_id: activePhrase.id,
        heart_coins_awarded: activePhrase.reward
      });

    if (insertError) {
      // Check if it's a unique constraint violation (race condition)
      if (insertError.code === '23505') { // unique_violation
        return {
          status: 'error',
          code: 'ALREADY_REDEEMED',
          message: 'You have already redeemed this signal.'
        };
      }
      console.error('Error inserting redemption:', insertError);
      return {
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to record redemption'
      };
    }

    // 2. Award heart coins using the same pattern as existing code
    if (activePhrase.reward > 0) {
      // Get current profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('heart_coins_current, heart_coins_total')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return {
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to update rewards'
        };
      }

      const currentCoins = profile?.heart_coins_current || 0;
      const totalCoins = profile?.heart_coins_total || 0;
      
      const newCurrentCoins = currentCoins + activePhrase.reward;
      const newTotalCoins = totalCoins + activePhrase.reward;

      // Update heart coins
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          heart_coins_current: newCurrentCoins,
          heart_coins_total: newTotalCoins,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating heart coins:', updateError);
        return {
          status: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to award heart coins'
        };
      }

      return {
        status: 'success',
        message: `Signal accepted! You earned ${activePhrase.reward} Heart Coins.`,
        rewardHeartCoins: activePhrase.reward,
        newHeartcoinBalance: newCurrentCoins
      };
    } else {
      return {
        status: 'success',
        message: 'Signal accepted!',
        rewardHeartCoins: 0
      };
    }

  } catch (error) {
    console.error('Unexpected error in redeemSecretPhrase:', error);
    return {
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Something glitched in the Heartverse. Try again in a moment.'
    };
  }
}