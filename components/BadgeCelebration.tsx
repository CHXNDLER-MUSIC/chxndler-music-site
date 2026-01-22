'use client';

import { useEffect, useState, useRef } from 'react';
import { BADGE_CELEBRATION_EVENT, type BadgeCelebrationDetail } from '@/utils/badgeCelebration';
import { isCelebrationAudioMuted } from '@/utils/celebrationAudio';

export default function BadgeCelebration() {
  const [isVisible, setIsVisible] = useState(false);
  const [badgeImage, setBadgeImage] = useState('');
  const [badgeTitle, setBadgeTitle] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use distinct, softer badge sound
      audioRef.current = new Audio('/audio/card-ding.mp3');
    }

    const handleCelebration = (event: CustomEvent<BadgeCelebrationDetail>) => {
      const { badgeImage: img, badgeTitle: title } = event.detail;
      if (!img || !title) return;

      setBadgeImage(img);
      setBadgeTitle(title);

      if (audioRef.current && !isCelebrationAudioMuted()) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 3500);
    };

    window.addEventListener(BADGE_CELEBRATION_EVENT, handleCelebration as EventListener);
    return () => {
      window.removeEventListener(BADGE_CELEBRATION_EVENT, handleCelebration as EventListener);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        style={{ animation: 'badgeFadeIn 0.3s ease-out' }}
      />

      {/* Badge celebration content */}
      <div
        className="relative flex flex-col items-center px-8 py-10 rounded-2xl"
        style={{
          background: 'rgba(10, 10, 30, 0.85)',
          boxShadow: '0 0 40px rgba(79, 172, 254, 0.3), 0 0 80px rgba(79, 172, 254, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(79, 172, 254, 0.3)',
          animation: 'badgePopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        {/* Neon glow circle behind badge */}
        <div
          className="absolute w-36 h-36 rounded-full blur-2xl opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(79, 172, 254, 0.5) 0%, transparent 70%)' }}
        />

        {/* Badge image */}
        <img
          src={badgeImage}
          alt={badgeTitle}
          className="w-28 h-28 relative z-10 rounded-full object-cover"
          style={{
            boxShadow: '0 0 20px rgba(79, 172, 254, 0.5)',
            animation: 'badgePulse 1.5s ease-in-out infinite',
          }}
        />

        {/* Text: Badge Unlocked */}
        <p
          className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mt-5 relative z-10"
          style={{ textShadow: '0 0 10px rgba(79, 172, 254, 0.8)' }}
        >
          Badge Unlocked
        </p>

        {/* Badge name */}
        <p
          className="text-white text-xl font-bold mt-2 relative z-10 text-center"
          style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.3)' }}
        >
          {badgeTitle}
        </p>
      </div>

      <style jsx>{`
        @keyframes badgeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes badgePopIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
