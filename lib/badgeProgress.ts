// Badge progress calculation utility
import { Badge, BadgeProgress, AttendanceCounts } from '@/types/badges';
import { log, warn } from '@/lib/logger';

// Allow any profile shape since we may get different Profile interfaces
type AnyProfile = any;

// Optional attendance counts for community badges
type OptionalAttendanceCounts = AttendanceCounts | null;

/**
 * Calculate badge progress for a given badge and user profile
 * Maps badge requirement types to profile counter columns
 * @param badge - The badge to calculate progress for
 * @param profile - The user's profile data
 * @param attendanceCounts - Optional attendance counts for community badges
 */
export function getBadgeProgressForUser(
  badge: Badge,
  profile: AnyProfile | null,
  attendanceCounts?: OptionalAttendanceCounts
): BadgeProgress {

  // Use requirement_count directly - only fallback to 1 if it's null/undefined, not if it's 0
  const target = badge.requirement_count != null && badge.requirement_count > 0
    ? badge.requirement_count
    : 1;

  if (!profile) {
    return {
      current: 0,
      target,
      percentage: 0,
      isUnlocked: false,
    };
  }

  let current = 0;
  

  // Switch on badge requirement type and map to profile counter
  switch (badge.requirement_type) {
    case 'reflections':
      // For reflection badges, count actual journal entries if available
      current = profile.total_reflections || 0;
      log(`Badge ${badge.slug || badge.badge_name}: reflections current=${current}, target=${target}`);
      break;
      
    case 'livestreams_watched':
      current = profile.streams_attended || 0;
      break;
      
    case 'concerts_attended':
      current = profile.concerts_attended || 0;
      break;
      
    case 'digital_cards_owned':
      // Digital card badges: Digital Collector, Memory Keeper, Cosmic Archivist, Starbinder, Master Collector
      current = profile.digital_cards_owned || 0;
      break;

    case 'merch_items_owned':
      // Merch badges: Merch Supporter, Merch Completionist
      current = profile.unique_merch_items || 0;
      break;
      
    case 'donations_made':
      current = profile.donations_made || 0;
      break;
      
    case 'heart_coins':
      // Current HeartCoin total for badges requiring HeartCoin balance
      current = profile.heartcoin_balance || 0;
      log(`Badge ${badge.slug || badge.badge_name}: heart_coins current=${current}, target=${target}`);
      break;
      
    case 'heart_transfers':
      current = profile.heartcoins_sent || 0;
      break;
      
    case 'listen':
      // Use unique songs count for listen-based badges (e.g. Deep Listener)
      current = profile.unique_songs_count || 0;
      log(`Badge ${badge.slug || badge.badge_name}: listen current=${current}, target=${target}`);
      break;
      
    case 'streak':
      // For streak badges, we'll need to calculate current streak from daily activity
      // For now, use elemental_sessions_count as a placeholder
      current = profile.elemental_sessions_count || 0;
      break;
      
    // Legacy compatibility cases
    case 'heartcoins':
    case 'heartcoins_earned':
      current = profile.total_heartcoins_earned || profile.heartcoin_total || 0;
      log(`Badge ${badge.slug || badge.badge_name}: heartcoins current=${current}, target=${target}`);
      break;
      
    case 'listening_time':
    case 'listening_minutes':
      current = profile.total_listening_minutes || 0;
      break;
      
    case 'elemental_sessions':
      current = profile.elemental_sessions_count || 0;
      break;
      
    case 'community_interactions':
      current = profile.community_interactions || 0;
      break;
      
    case 'achievements':
      current = profile.achievements_unlocked || 0;
      break;
      
    case 'streams_watched':
      current = profile.streams_attended || 0;
      break;
      
    case 'cards_owned':
      // Legacy: use digital_cards_owned for card collector badges
      current = profile.digital_cards_owned || 0;
      break;

    case 'merch_items':
      // Legacy: use unique_merch_items for merch badges
      current = profile.unique_merch_items || 0;
      break;
      
    case 'donations':
      current = profile.donations_made || 0;
      break;
      
    case 'heartcoins_sent':
      current = profile.heartcoins_sent || 0;
      break;
      
    case 'heartcoin_transfers':
      current = profile.heartcoins_sent || 0;
      break;

    case 'heart coins':
      // Handle space-separated variant of heartcoins
      current = profile.heartcoin_total || 0;
      break;

    // Attendance-based community badges (from secret phrase redemptions)
    case 'attendance_live_stream':
      // Counts only LIVE_STREAM attendance from secret phrase redemptions
      current = attendanceCounts?.liveStreamCount ?? profile.streams_attended ?? 0;
      break;

    case 'attendance_in_person':
      // Counts only IN_PERSON attendance from secret phrase redemptions
      current = attendanceCounts?.inPersonCount ?? profile.concerts_attended ?? 0;
      break;

    case 'attendance_any':
    case 'attendance_total':
      // Counts any type of attendance from secret phrase redemptions
      current = attendanceCounts?.totalAttendanceCount ??
        ((profile.streams_attended ?? 0) + (profile.concerts_attended ?? 0));
      break;

    default:
      // TODO: Add support for new requirement types as they are added
      warn(`Unknown requirement type: ${badge.requirement_type} for badge: ${badge.slug || badge.badge_name || badge.id}`);
      current = 0;
  }

  const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const isUnlocked = current >= target;

  const result = {
    current,
    target,
    percentage,
    isUnlocked,
  };
  

  return result;
}

/**
 * Format requirement text for display
 */
export function formatRequirementText(badge: Badge): string {
  // If badge has custom requirement_text, use it
  if (badge.requirement_text) {
    return badge.requirement_text;
  }

  // Otherwise generate from requirement_type and requirement_count
  const { requirement_type, requirement_count } = badge;
  
  // Safety check - if we don't have the required fields, return empty string
  if (!requirement_type || !requirement_count) {
    return '';
  }
  
  switch (requirement_type) {
    case 'reflections':
      return `${requirement_count} reflection${requirement_count === 1 ? '' : 's'}`;
      
    case 'livestreams_watched':
      return `${requirement_count} livestream${requirement_count === 1 ? '' : 's'} watched`;
      
    case 'concerts_attended':
      return `${requirement_count} concert${requirement_count === 1 ? '' : 's'} attended`;
      
    case 'digital_cards_owned':
      return `${requirement_count} digital card${requirement_count === 1 ? '' : 's'} owned`;
      
    case 'merch_items_owned':
      return `${requirement_count} merch item${requirement_count === 1 ? '' : 's'} owned`;
      
    case 'donations_made':
      return `${requirement_count} donation${requirement_count === 1 ? '' : 's'} made`;
      
    case 'heart_coins':
      return `Earn ${requirement_count} HeartCoin${requirement_count === 1 ? '' : 's'}`;
      
    case 'heart_transfers':
      return `${requirement_count} HeartCoin transfer${requirement_count === 1 ? '' : 's'}`;
      
    case 'listen':
      return `Listen to ${requirement_count} unique ${requirement_count === 1 ? 'song' : 'songs'}`;
      
    case 'streak':
      return `${requirement_count} day streak`;
      
    // Legacy compatibility cases
    case 'heartcoins':
    case 'heartcoins_earned':
      return `${requirement_count} HeartCoin${requirement_count === 1 ? '' : 's'}`;
      
    case 'listening_time':
    case 'listening_minutes':
      if (requirement_count < 60) {
        return `${requirement_count} minute${requirement_count === 1 ? '' : 's'} listening`;
      } else {
        const hours = Math.floor(requirement_count / 60);
        return `${hours} hour${hours === 1 ? '' : 's'} listening`;
      }
      
    case 'elemental_sessions':
      return `${requirement_count} elemental session${requirement_count === 1 ? '' : 's'}`;
      
    case 'community_interactions':
      return `${requirement_count} community interaction${requirement_count === 1 ? '' : 's'}`;
      
    case 'achievements':
      return `${requirement_count} achievement${requirement_count === 1 ? '' : 's'}`;
      
    case 'streams_watched':
      return `${requirement_count} livestream${requirement_count === 1 ? '' : 's'} watched`;
      
    case 'cards_owned':
      return `${requirement_count} card${requirement_count === 1 ? '' : 's'} owned`;
      
    case 'merch_items':
      return `${requirement_count} merch item${requirement_count === 1 ? '' : 's'} owned`;
      
    case 'donations':
      return `${requirement_count} donation${requirement_count === 1 ? '' : 's'} made`;
      
    case 'heartcoins_sent':
      return `${requirement_count} HeartCoin${requirement_count === 1 ? '' : 's'} sent`;

    // Attendance-based community badges
    case 'attendance_live_stream':
      return `Attend ${requirement_count} live stream${requirement_count === 1 ? '' : 's'}`;

    case 'attendance_in_person':
      return `Attend ${requirement_count} in-person concert${requirement_count === 1 ? '' : 's'}`;

    case 'attendance_any':
    case 'attendance_total':
      return `Attend ${requirement_count} event${requirement_count === 1 ? '' : 's'} (any type)`;

    default:
      return `${requirement_count} ${requirement_type.replace(/_/g, ' ')}`;
  }
}
