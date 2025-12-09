// Badge progress calculation utility
import { Badge, BadgeProgress } from '@/types/badges';

// Allow any profile shape since we may get different Profile interfaces
type AnyProfile = any;

/**
 * Calculate badge progress for a given badge and user profile
 * Maps badge requirement types to profile counter columns
 */
export function getBadgeProgressForUser(
  badge: Badge,
  profile: AnyProfile | null
): BadgeProgress {
  if (!profile) {
    return {
      current: 0,
      target: badge.requirement_count,
      percentage: 0,
      isUnlocked: false,
    };
  }

  let current = 0;
  const target = badge.requirement_count;

  // Switch on badge requirement type and map to profile counter
  switch (badge.requirement_type) {
    case 'reflections':
      current = profile.total_reflections || 0;
      break;
      
    case 'heartcoins':
    case 'heartcoins_earned':
      current = profile.total_heartcoins_earned || 0;
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
    case 'livestreams_watched':
      current = profile.streams_attended || 0;
      break;
      
    case 'concerts_attended':
      current = profile.concerts_attended || 0;
      break;
      
    case 'digital_cards_owned':
    case 'cards_owned':
      current = profile.cards_owned || 0;
      break;
      
    case 'merch_items_owned':
    case 'merch_items':
      current = profile.merch_items_owned || 0;
      break;
      
    case 'donations_made':
    case 'donations':
      current = profile.donations_made || 0;
      break;
      
    case 'heartcoins_sent':
      current = profile.heartcoins_sent || 0;
      break;
      
    default:
      // TODO: Add support for new requirement types as they are added
      console.warn(`Unknown requirement type: ${badge.requirement_type} for badge: ${badge.slug}`);
      current = 0;
  }

  const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const isUnlocked = current >= target;

  return {
    current,
    target,
    percentage,
    isUnlocked,
  };
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
  
  switch (requirement_type) {
    case 'reflections':
      return `${requirement_count} reflection${requirement_count === 1 ? '' : 's'}`;
      
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
    case 'livestreams_watched':
      return `${requirement_count} livestream${requirement_count === 1 ? '' : 's'} watched`;
      
    case 'concerts_attended':
      return `${requirement_count} concert${requirement_count === 1 ? '' : 's'} attended`;
      
    case 'digital_cards_owned':
    case 'cards_owned':
      return `${requirement_count} card${requirement_count === 1 ? '' : 's'} owned`;
      
    case 'merch_items_owned':
    case 'merch_items':
      return `${requirement_count} merch item${requirement_count === 1 ? '' : 's'} owned`;
      
    case 'donations_made':
    case 'donations':
      return `${requirement_count} donation${requirement_count === 1 ? '' : 's'} made`;
      
    case 'heartcoins_sent':
      return `${requirement_count} HeartCoin${requirement_count === 1 ? '' : 's'} sent`;
      
    default:
      return `${requirement_count} ${requirement_type}`;
  }
}