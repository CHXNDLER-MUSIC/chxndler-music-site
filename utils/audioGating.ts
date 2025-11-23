import { getCardGateState } from './cardGating';
import type { CardGateState } from './cardGating';
import type { Tier } from './tier';
import { getTierDisplayName } from './tier';

export interface AudioTrack {
  slug?: string;
  title?: string;
  name?: string;
  is_released?: boolean;
  min_tier?: Tier;
}

export interface AudioProfile {
  id: string;
  tier?: string;
  cards?: any[];
}

export interface AudioGateResult {
  allowed: boolean;
  reason?: string;
  gateState: CardGateState;
}

/**
 * Check if a user can play a specific audio track based on their tier and ownership
 */
export function canPlayAudio(
  track: AudioTrack,
  profile: AudioProfile | null,
  userCards: any[] = []
): AudioGateResult {
  if (!track) {
    return {
      allowed: false,
      reason: 'Track not found',
      gateState: 'comingSoon'
    };
  }

  // Create a card object from the track for gating logic
  const cardData = {
    id: track.slug || track.title || track.name || '',
    card_name: track.title || track.name || '',
    is_released: track.is_released ?? true,
    min_tier: track.min_tier || 'wanderer'
  };

  const profileData = profile ? {
    id: profile.id,
    tier: profile.tier || 'wanderer'
  } : null;

  // Get user's cards if they exist
  const ownedCards = userCards.length > 0 ? userCards : (profile?.cards?.map(cardRow => ({
    user_id: profile.id,
    card_id: cardRow.cards?.id || '',
    card_name: cardRow.cards?.card_name || ''
  })) || []);

  const gateState = getCardGateState(cardData, profileData, ownedCards);

  switch (gateState) {
    case 'owned':
    case 'available':
      return {
        allowed: true,
        gateState
      };

    case 'comingSoon':
      return {
        allowed: false,
        reason: 'Song not released yet',
        gateState
      };

    case 'lockedTier':
      const tierName = getTierDisplayName(track.min_tier || 'wanderer');
      return {
        allowed: false,
        reason: `Unlock at ${tierName} to listen`,
        gateState
      };

    default:
      return {
        allowed: false,
        reason: 'Access denied',
        gateState: 'comingSoon'
      };
  }
}

/**
 * React hook for audio gating (if components need reactive updates)
 */
export function useAudioGating(track: AudioTrack, profile: AudioProfile | null, userCards: any[] = []) {
  return canPlayAudio(track, profile, userCards);
}

/**
 * Display the appropriate error message for blocked audio
 */
export function getAudioBlockMessage(result: AudioGateResult): string {
  return result.reason || 'Cannot play this track';
}

/**
 * Check if any tracks in a playlist can be played
 */
export function getPlayableTracksCount(
  tracks: AudioTrack[],
  profile: AudioProfile | null,
  userCards: any[] = []
): number {
  return tracks.filter(track => canPlayAudio(track, profile, userCards).allowed).length;
}