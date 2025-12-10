import { supabaseBrowser } from '@/lib/supabase-browser';

/**
 * Update badge progress counters for a specific user
 * This should be called whenever the user completes activities that count toward badges
 */
export async function updateBadgeProgressCounters(userId: string) {
  try {
    console.log('Updating badge progress counters for user:', userId);

    // Get current reflection count from soul_journal_entries
    const { data: reflectionData, error: reflectionError } = await supabaseBrowser
      .from('soul_journal_entries')
      .select('id')
      .eq('user_id', userId);

    if (reflectionError) {
      console.error('Error counting reflections:', reflectionError);
    }

    const reflectionCount = reflectionData?.length || 0;
    console.log('Current reflection count:', reflectionCount);

    // Update the user's profile with the current counts
    const { error: updateError } = await supabaseBrowser
      .from('profiles')
      .update({
        total_reflections: reflectionCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile counters:', updateError);
      throw updateError;
    }

    console.log('Successfully updated badge progress counters');
    return true;
  } catch (error) {
    console.error('Error in updateBadgeProgressCounters:', error);
    return false;
  }
}

/**
 * Calculate real-time progress for a specific badge type
 */
export async function calculateRealtimeBadgeProgress(userId: string, requirementType: string) {
  try {
    let current = 0;

    switch (requirementType) {
      case 'reflections': {
        const { data, error } = await supabaseBrowser
          .from('soul_journal_entries')
          .select('id')
          .eq('user_id', userId);
        
        if (!error) {
          current = data?.length || 0;
        }
        break;
      }
      
      case 'heartcoins':
      case 'heartcoins_earned':
      case 'heart_coins': {
        const { data, error } = await supabaseBrowser
          .from('profiles')
          .select('heartcoin_balance, heartcoin_total, total_heartcoins_earned')
          .eq('id', userId)
          .single();
        
        if (!error && data) {
          current = data.total_heartcoins_earned || data.heartcoin_total || data.heartcoin_balance || 0;
        }
        break;
      }
      
      // Add more requirement types as needed
      default:
        console.warn('Real-time calculation not implemented for requirement type:', requirementType);
    }

    return current;
  } catch (error) {
    console.error('Error calculating real-time badge progress:', error);
    return 0;
  }
}