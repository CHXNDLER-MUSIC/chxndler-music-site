'use client';

import { useEffect, useState, useRef } from 'react';
import { isCelebrationAudioAllowed } from '@/utils/celebrationAudio';
import type { ElementType } from '@/lib/planetConfig';

export const RELIC_CELEBRATION_EVENT = 'relic:celebration';

export interface RelicCelebrationDetail {
  element: ElementType;
  rewardKey: string;
  relicLabel?: string | null;
  relicImageUrl?: string | null;
  relicKind?: string | null;
}

// Element colors for styling
const ELEMENT_COLORS: Record<ElementType, string> = {
  heart: '#FC54AF',
  water: '#38B6FF',
  lightning: '#F2EF1D',
  darkness: '#FFFFFF',
};

export default function RelicCelebration() {
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<RelicCelebrationDetail | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio instance once (use softer chime for relics)
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/audio/card-ding.mp3');
    }

    const handleCelebration = (event: CustomEvent<RelicCelebrationDetail>) => {
      const detail = event.detail;
      console.log('[RelicCelebration] Received event:', detail);

      if (!detail?.element || !detail?.rewardKey) return;

      setData(detail);

      // Play sound only when enabled and not muted
      if (audioRef.current && isCelebrationAudioAllowed()) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }

      // Show celebration
      setIsVisible(true);

      // Hide after 3 seconds, then open appropriate display based on reward type
      setTimeout(() => {
        setIsVisible(false);

        // After celebration ends, open appropriate display based on relic type
        // Check relicKind first, fall back to rewardKey string matching
        const relicKind = detail.relicKind?.toLowerCase() || '';
        const rewardKey = detail.rewardKey?.toLowerCase() || '';

        // Determine relic type: check kind field first, then fall back to key matching
        const isSlot = relicKind === 'slot' || rewardKey.includes('slot') || rewardKey.includes('card_slot');
        const isBoost = relicKind === 'boost' || rewardKey.includes('boost');

        if (isSlot) {
          // SLOT type -> open binder display
          window.dispatchEvent(new CustomEvent('openDigitalBinder'));
        } else if (isBoost) {
          // BOOST type -> refresh boosts first, then open profile display
          window.dispatchEvent(new CustomEvent('boosts:refresh'));
          window.dispatchEvent(new CustomEvent('openProfilePopover', {
            detail: { showRelics: false }
          }));
        } else {
          // Any other type -> open profile display AND relics collection
          window.dispatchEvent(new CustomEvent('openProfilePopover', {
            detail: { showRelics: true }
          }));
        }

        setData(null);
      }, 3000);
    };

    window.addEventListener(RELIC_CELEBRATION_EVENT, handleCelebration as EventListener);

    return () => {
      window.removeEventListener(RELIC_CELEBRATION_EVENT, handleCelebration as EventListener);
    };
  }, []);

  if (!isVisible || !data) return null;

  const elementColor = ELEMENT_COLORS[data.element] || '#FC54AF';

  // Use the relic image from the database, or fallback to element planet
  const relicImage = data.relicImageUrl || `/relics/planet_${data.element}.webp`;

  // Use the relic label from the database
  const relicLabel = data.relicLabel || 'Relic Claimed!';

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center pointer-events-none"
      style={{ alignItems: 'center', paddingBottom: '10vh' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Celebration content */}
      <div className="relative flex flex-col items-center">
        {/* Glowing background circle */}
        <div
          className="absolute w-64 h-64 rounded-full blur-xl"
          style={{ backgroundColor: `${elementColor}40` }}
        />

        {/* Relic image */}
        <img
          src={relicImage}
          alt={relicLabel}
          className="w-48 h-48 relative z-10 object-contain"
          style={{
            animation: 'cardPulse 2s ease-in-out infinite',
            filter: `drop-shadow(0 0 20px ${elementColor}) drop-shadow(0 0 40px ${elementColor}80)`,
          }}
        />

        {/* Relic label */}
        <p
          className="font-bold text-xl mt-4 relative z-10 text-center px-4"
          style={{
            color: elementColor,
            textShadow: `0 0 10px ${elementColor}80`,
          }}
        >
          {relicLabel}
        </p>
      </div>
    </div>
  );
}
