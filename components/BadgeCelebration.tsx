'use client';

import { useEffect, useState, useRef } from 'react';
import { BADGE_CELEBRATION_EVENT, type BadgeCelebrationDetail } from '@/utils/badgeCelebration';

export default function BadgeCelebration() {
  const [isVisible, setIsVisible] = useState(false);
  const [badgeImage, setBadgeImage] = useState('');
  const [badgeTitle, setBadgeTitle] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Reuse existing sound for now
      audioRef.current = new Audio('/audio/heart-coin.mp3');
    }

    const handleCelebration = (event: CustomEvent<BadgeCelebrationDetail>) => {
      const { badgeImage: img, badgeTitle: title } = event.detail;
      if (!img || !title) return;

      setBadgeImage(img);
      setBadgeTitle(title);

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 3000);
    };

    window.addEventListener(BADGE_CELEBRATION_EVENT, handleCelebration as EventListener);
    return () => {
      window.removeEventListener(BADGE_CELEBRATION_EVENT, handleCelebration as EventListener);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center pointer-events-none" style={{ padding: '4vh 2rem' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm heartcoin-backdrop-fade" />

      {/* Celebration content */}
      <div className="relative flex flex-col items-center heartcoin-pop w-full max-w-sm justify-center" style={{ minHeight: 'fit-content', maxHeight: '92vh' }}>
        {/* Glowing background circle */}
        <div className="absolute w-40 h-40 bg-blue-500/30 rounded-full blur-xl" />

        {/* Badge image */}
        <img
          src={badgeImage}
          alt={badgeTitle}
          className="w-40 h-40 relative z-10 rounded-full object-cover"
          style={{
            animation: 'cardPulse 2s ease-in-out infinite',
            maxHeight: '60vh',
            height: 'auto',
            aspectRatio: '1 / 1'
          }}
        />

        {/* Text */}
        <p className="text-white font-bold text-lg mt-3 relative z-10 text-center">
          {badgeTitle}
        </p>
      </div>
    </div>
  );
}

