import { supabaseBrowser } from '@/lib/supabase-browser';
import { getBadgeProgressForUser } from '@/lib/badgeProgress';
import { log, warn } from '@/lib/logger';
import { markBadgeAsSeenInStorage } from '@/lib/useBadgeCelebrations';

// Session-level cache tracking now only prevents duplicate DB inserts
// Celebration UI is handled by the realtime controller listening to user_badges inserts
const celebratedBadgesThisSession = new Set<string>();

/**
 * Update badge progress counters for a specific user
 * This should be called whenever the user completes activities that count toward badges
 */
export async function updateBadgeProgressCounters(userId: string) {
  try {
    log('Updating badge progress counters for user:', userId);

    // Get current reflection count from soul_journal_entries
    const { data: reflectionData, error: reflectionError } = await supabaseBrowser
      .from('soul_journal_entries')
      .select('entry_id')
      .eq('user_id', userId);

    if (reflectionError) {
      console.error('Error counting reflections:', reflectionError);
    }

    const reflectionCount = reflectionData?.length || 0;
    log('Current reflection count:', reflectionCount);

    // Update the user's profile with the current counts (do NOT send updated_at)
    const { error: updateError } = await supabaseBrowser
      .from('profiles')
      .update({
        total_reflections: reflectionCount
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile counters:', updateError);
      throw updateError;
    }

    log('Successfully updated badge progress counters');
    
    // Check and award any newly eligible badges
    const newlyAwardedBadges = await checkAndAwardEligibleBadges(userId);
    // Summary only; show details via debug if needed
    log('badgeProgress summary:', {
      newlyAwarded: newlyAwardedBadges.length,
      computedAt: new Date().toISOString(),
    });
    
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
          .select('entry_id')
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
        if (process.env.NODE_ENV !== "production") console.warn('Real-time calculation not implemented for requirement type:', requirementType);
    }

    return current;
  } catch (error) {
    console.error('Error calculating real-time badge progress:', error);
    return 0;
  }
}

/**
 * Manually trigger badge check for current user (for testing/debug)
 */
export async function manualBadgeCheck() {
  if (typeof window !== 'undefined') {
    // Get current user from Supabase auth
    const { data: { user }, error } = await supabaseBrowser.auth.getUser();
    if (user) {
      log('🔍 Manual badge check triggered for user:', user.id);
      return await checkAndAwardEligibleBadges(user.id);
    } else {
      warn('No authenticated user for manual badge check');
      return [];
    }
  }
  return [];
}

/**
 * Check and automatically award badges that the user has earned
 */
export async function checkAndAwardEligibleBadges(userId: string) {
  try {
    log('Checking for eligible badges for user:', userId);

    // Get user profile for progress calculation
    const { data: profile, error: profileError } = await supabaseBrowser
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile for badge check:', profileError);
      return [];
    }

    // Get all badges
    const { data: allBadges, error: badgesError } = await supabaseBrowser
      .from('badges')
      .select('*');

    if (badgesError || !allBadges) {
      console.error('Error fetching badges for eligibility check:', badgesError);
      return [];
    }

    // Get already earned badges
    const { data: userBadges, error: userBadgesError } = await supabaseBrowser
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    if (userBadgesError) {
      console.error('Error fetching user badges:', userBadgesError);
      return [];
    }

    const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);
    const newlyAwardedBadges = [];

    // Check each badge for eligibility
    for (const badge of allBadges) {
      // Skip if already earned (from database)
      if (earnedBadgeIds.has(badge.id)) {
        continue;
      }

      // Skip if already celebrated this session (prevents race condition duplicates)
      const celebrationKey = `${userId}:${badge.id}`;
      if (celebratedBadgesThisSession.has(celebrationKey)) {
        continue;
      }

      // Skip if missing requirement data
      if (!badge.requirement_type || !badge.requirement_count) {
        continue;
      }

      // Calculate progress for this badge
      const badgeProgress = getBadgeProgressForUser(badge, profile);
      // Reduce output; avoid per-badge progress logs to prevent noise

      // Award badge if requirement is met
      if (badgeProgress.isUnlocked) {
        log(`🎉 Awarding badge: ${badge.badge_name}`);

        // Mark as celebrated BEFORE attempting insert to prevent race condition duplicates
        celebratedBadgesThisSession.add(celebrationKey);

        const earnedAt = new Date().toISOString();
        const { error: awardError } = await supabaseBrowser
          .from('user_badges')
          .insert({
            user_id: userId,
            badge_id: badge.id,
            earned_at: earnedAt
          });

        if (awardError) {
          // Ignore duplicate key errors (already awarded)
          if (awardError.code !== '23505') {
            console.error('Error awarding badge:', badge.badge_name, awardError);
          }
          // Note: We keep the badge in celebratedBadgesThisSession even on error
          // to prevent repeated attempts in the same session
        } else {
          newlyAwardedBadges.push(badge);
          log(`✅ Successfully awarded badge: ${badge.badge_name}`);

          // Mark this badge as "seen" in localStorage immediately so the realtime
          // handler won't celebrate it. This fixes a race condition where the
          // Supabase realtime INSERT event arrives after suppression has ended,
          // causing unwanted celebrations on page load.
          markBadgeAsSeenInStorage(badge.id, earnedAt);
        }
      }
    }

    // Summary for this run
    log('badgeProgress summary:', {
      totalBadges: allBadges?.length || 0,
      newlyAwarded: newlyAwardedBadges.length,
      computedAt: new Date().toISOString(),
    });
    return newlyAwardedBadges;
  } catch (error) {
    console.error('Error in checkAndAwardEligibleBadges:', error);
    return [];
  }
}
