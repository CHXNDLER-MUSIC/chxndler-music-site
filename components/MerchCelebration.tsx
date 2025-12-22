'use client';

import { useEffect, useState, useRef } from 'react';
import { MERCH_CELEBRATION_EVENT, type MerchCelebrationDetail } from '@/utils/merchCelebration';

export default function MerchCelebration() {
  const [isVisible, setIsVisible] = useState(false);
  const [itemName, setItemName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio instance once (reuse heart-coin sound for now)
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/audio/heart-coin.mp3');
    }

    const handleCelebration = (event: CustomEvent<MerchCelebrationDetail>) => {
      const { itemName: name, imageUrl: image } = event.detail;

      if (!name || !image) return;

      // Set the item details to display
      setItemName(name);
      setImageUrl(image);

      // Play sound
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }

      // Show celebration
      setIsVisible(true);

      // Hide after 3 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    };

    // Add event listener
    window.addEventListener(MERCH_CELEBRATION_EVENT, handleCelebration as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener(MERCH_CELEBRATION_EVENT, handleCelebration as EventListener);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none" style={{ alignItems: 'center', paddingBottom: '10vh' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm heartcoin-backdrop-fade" />

      {/* Celebration content */}
      <div className="relative flex flex-col items-center heartcoin-pop">
        {/* Glowing background circle */}
        <div className="absolute w-64 h-64 bg-[#4ECDC4]/30 rounded-full blur-xl" />

        {/* Merch item image */}
        <img
          src={imageUrl}
          alt={itemName}
          className="w-48 h-48 object-contain relative z-10"
          style={{
            animation: 'cardPulse 2s ease-in-out infinite'
          }}
        />

        {/* Text */}
        <p className="text-white font-bold text-xl mt-4 relative z-10 text-center">
          {itemName} Purchased!
        </p>
        <p className="text-white/70 text-sm mt-2 relative z-10">
          Check your email for order confirmation
        </p>
      </div>
    </div>
  );
}
