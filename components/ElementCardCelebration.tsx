'use client';

import { useEffect, useState, useRef } from 'react';
import { ELEMENT_CARD_CELEBRATION_EVENT, type ElementCardCelebrationDetail } from '@/utils/elementCardCelebration';
import { getCardImageUrl } from '@/lib/supabaseCardUrl';

// Element display names
const ELEMENT_NAMES: Record<string, string> = {
  heart: 'Heart',
  water: 'Water',
  lightning: 'Lightning',
  darkness: 'Darkness',
};

// Element card images from Supabase Storage
const ELEMENT_CARD_IMAGES: Record<string, string> = {
  heart: getCardImageUrl('HEART'),
  water: getCardImageUrl('WATER'),
  lightning: getCardImageUrl('LIGHTNING'),
  darkness: getCardImageUrl('DARKNESS'),
};

// Element colors for glow effect
const ELEMENT_COLORS: Record<string, string> = {
  heart: 'rgba(255, 105, 180, 0.3)', // Pink
  water: 'rgba(0, 191, 255, 0.3)',   // Deep sky blue
  lightning: 'rgba(255, 255, 0, 0.3)', // Yellow
  darkness: 'rgba(128, 0, 128, 0.3)',  // Purple
};

export default function ElementCardCelebration() {
  const [isVisible, setIsVisible] = useState(false);
  const [element, setElement] = useState('heart');
  const [userName, setUserName] = useState<string | null>(null);
  const isShowingRef = useRef(false); // Prevent double-triggering
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleCelebration = (event: CustomEvent<ElementCardCelebrationDetail>) => {
      // Prevent double-triggering
      if (isShowingRef.current) return;
      isShowingRef.current = true;

      const { element: celebrationElement, userName: celebrationUserName, onComplete } = event.detail;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set the element and user name to display
      setElement(celebrationElement?.toLowerCase() || 'heart');
      setUserName(celebrationUserName || null);

      // Show celebration
      setIsVisible(true);

      // Hide after 4 seconds and trigger callback
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        isShowingRef.current = false;
        if (onComplete) {
          onComplete();
        }
      }, 4000);
    };

    // Add event listener
    window.addEventListener(ELEMENT_CARD_CELEBRATION_EVENT, handleCelebration as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener(ELEMENT_CARD_CELEBRATION_EVENT, handleCelebration as EventListener);
    };
  }, []);

  if (!isVisible) return null;

  const elementImage = ELEMENT_CARD_IMAGES[element] || getCardImageUrl(element);
  const elementName = ELEMENT_NAMES[element] || element;
  const glowColor = ELEMENT_COLORS[element] || 'rgba(255, 105, 180, 0.3)';

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center pointer-events-none" style={{ alignItems: 'center', paddingBottom: '10vh' }}>
      {/* Backdrop - 4s animation with forwards fill to prevent flicker */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        style={{ animation: 'heartcoinBackdropFade 4s ease-out forwards' }}
      />

      {/* Celebration content - 4s animation with forwards fill to prevent flicker */}
      <div
        className="relative flex flex-col items-center"
        style={{ animation: 'heartcoinPop 4s ease-out forwards' }}
      >
        {/* Glowing background circle */}
        <div
          className="absolute w-64 h-64 rounded-full blur-xl"
          style={{ backgroundColor: glowColor }}
        />

        {/* Element card image */}
        <img
          src={elementImage}
          alt={`${elementName} Element`}
          className="w-48 h-auto relative z-10 rounded-lg object-contain"
          style={{
            animation: 'cardPulse 2s ease-in-out infinite',
            boxShadow: `0 0 40px ${glowColor}, 0 0 80px ${glowColor}`,
          }}
        />

        {/* Text */}
        <p className="text-white font-bold text-xl mt-4 relative z-10 text-center">
          Welcome Home{userName ? `, ${userName}` : ''}
        </p>
        <p className="text-white/70 text-sm mt-1 relative z-10">
          Your elemental card awaits in the binder
        </p>
      </div>
    </div>
  );
}
