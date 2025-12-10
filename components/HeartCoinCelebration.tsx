'use client';

import { useEffect, useState, useRef } from 'react';
import { HEARTCOIN_CELEBRATION_EVENT, type HeartCoinCelebrationDetail } from '@/utils/heartcoinCelebration';

export default function HeartCoinCelebration() {
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio instance once
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/card-ding.mp3');
    }

    const handleCelebration = (event: CustomEvent<HeartCoinCelebrationDetail>) => {
      const { amount } = event.detail;
      
      // Only celebrate for exactly 1 HeartCoin
      if (amount !== 1) return;

      // Play sound
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }

      // Show celebration
      setIsVisible(true);

      // Hide after 1.5 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 1500);
    };

    // Add event listener
    window.addEventListener(HEARTCOIN_CELEBRATION_EVENT, handleCelebration as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener(HEARTCOIN_CELEBRATION_EVENT, handleCelebration as EventListener);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm heartcoin-backdrop-fade" />
      
      {/* Celebration content */}
      <div className="relative flex flex-col items-center heartcoin-pop">
        {/* Glowing background circle */}
        <div className="absolute w-64 h-64 bg-pink-500/30 rounded-full blur-xl" />
        
        {/* Heart coin image */}
        <img 
          src="/heart-coin.webp" 
          alt="HeartCoin" 
          className="w-48 h-48 relative z-10"
        />
        
        {/* Text */}
        <p className="text-white font-bold uppercase text-xl mt-4 relative z-10">
          +1 HeartCoin
        </p>
      </div>
    </div>
  );
}