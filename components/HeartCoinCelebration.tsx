'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HEARTCOIN_CELEBRATION_EVENT, type HeartCoinCelebrationDetail } from '@/utils/heartcoinCelebration';
import { isCelebrationAudioAllowed } from '@/utils/celebrationAudio';

export default function HeartCoinCelebration() {
  const [isVisible, setIsVisible] = useState(false);
  const [amount, setAmount] = useState(1);
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const portalRootRef = useRef<HTMLDivElement | null>(null);

  // Create a dedicated portal root at the very end of <body> for guaranteed top-layer rendering.
  // This ensures the celebration always paints above modals/journals regardless of stacking context.
  useEffect(() => {
    const id = 'heartcoin-celebration-root';
    let root = document.getElementById(id) as HTMLDivElement | null;
    if (!root) {
      root = document.createElement('div');
      root.id = id;
      root.style.position = 'relative';
      root.style.zIndex = '2147483647';
      document.body.appendChild(root);
    }
    portalRootRef.current = root;
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    // Create audio instance once
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/audio/heart-coin.mp3');
    }

    const handleCelebration = (event: CustomEvent<HeartCoinCelebrationDetail>) => {
      const { amount: celebrationAmount } = event.detail;

      // Only celebrate for positive amounts
      if (celebrationAmount <= 0) return;

      // Clear any existing hide timeout (in case of rapid celebrations)
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      // Set the amount to display
      setAmount(celebrationAmount);

      // Play sound only when enabled and not muted
      if (audioRef.current && isCelebrationAudioAllowed()) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }

      // Show celebration
      setIsVisible(true);

      // Hide after 3 seconds
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        hideTimeoutRef.current = null;
        // Dispatch completion event for onboarding sequence orchestration
        window.dispatchEvent(new CustomEvent('heartcoin:celebration-complete', {
          detail: { amount: celebrationAmount }
        }));
      }, 3000);
    };

    // Add event listener
    window.addEventListener(HEARTCOIN_CELEBRATION_EVENT, handleCelebration as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener(HEARTCOIN_CELEBRATION_EVENT, handleCelebration as EventListener);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Don't render on server or when not visible
  if (!mounted || !isVisible || !portalRootRef.current) return null;

  // Render via portal to a dedicated root div at the end of <body> for guaranteed top-layer rendering
  const celebrationContent = (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none"
      style={{
        alignItems: 'center',
        paddingBottom: '10vh',
        zIndex: 2147483647,
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm heartcoin-backdrop-fade" />

      {/* Celebration content */}
      <div className="relative flex flex-col items-center heartcoin-pop">
        {/* Glowing background circle */}
        <div className="absolute w-64 h-64 bg-pink-500/30 rounded-full blur-xl" />

        {/* Heart coin image */}
        <img
          src="/elements/heart-coin.webp"
          alt="HeartCoin"
          className="w-48 h-48 relative z-10"
          style={{
            animation: 'cardPulse 2s ease-in-out infinite'
          }}
        />

        {/* Text */}
        <p className="text-white font-bold text-xl mt-4 relative z-10">
          +{amount} HeartCoin{amount !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );

  return createPortal(celebrationContent, portalRootRef.current);
}
