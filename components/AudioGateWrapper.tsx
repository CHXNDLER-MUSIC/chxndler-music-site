"use client";

import React from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { canPlayAudio, getAudioBlockMessage } from '@/utils/audioGating';
import type { AudioTrack } from '@/utils/audioGating';

interface AudioGateWrapperProps {
  track: AudioTrack;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showMessage?: boolean;
  onBlock?: (reason: string) => void;
  className?: string;
}

/**
 * Wrapper component that gates audio-related functionality based on user tier and ownership
 */
export default function AudioGateWrapper({ 
  track, 
  children, 
  fallback, 
  showMessage = true,
  onBlock,
  className = ''
}: AudioGateWrapperProps) {
  const { profile } = useProfile();

  // Get user's owned cards
  const userCards = profile?.cards?.map(cardRow => ({
    user_id: profile.id,
    card_id: cardRow.cards?.id || '',
    card_name: cardRow.cards?.card_name || ''
  })) || [];

  const gateResult = canPlayAudio(track, profile, userCards);

  if (gateResult.allowed) {
    return <>{children}</>;
  }

  // Blocked - trigger callback if provided
  if (onBlock) {
    onBlock(gateResult.reason || 'Access denied');
  }

  // Show fallback if provided
  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  // Show default blocked message
  if (showMessage) {
    const message = getAudioBlockMessage(gateResult);
    return (
      <div className={`audio-gate-blocked flex items-center justify-center p-3 rounded-lg border border-gray-400/60 bg-gray-500/10 ${className}`}>
        <div className="text-center">
          <div className="text-sm text-gray-300 mb-1">
            🔒 {track.title || track.name || 'Track'}
          </div>
          <div className="text-xs text-gray-400">
            {message}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Hook for components that need to check gating without rendering
 */
export function useAudioGate(track: AudioTrack) {
  const { profile } = useProfile();
  
  const userCards = profile?.cards?.map(cardRow => ({
    user_id: profile.id,
    card_id: cardRow.cards?.id || '',
    card_name: cardRow.cards?.card_name || ''
  })) || [];

  return canPlayAudio(track, profile, userCards);
}