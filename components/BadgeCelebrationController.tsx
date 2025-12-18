'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useBadgeCelebrations, type BadgeCelebrationItem } from '@/lib/useBadgeCelebrations';
import { useAuth } from '@/app/providers/AuthProvider';

type CelebrationPhase = 'idle' | 'badge' | 'pause' | 'heartcoin';

const BADGE_DURATION = 1600;
const PAUSE_DURATION = 250;
const HEARTCOIN_DURATION = 1200;

export default function BadgeCelebrationController() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { next, pop } = useBadgeCelebrations(userId);

  const [phase, setPhase] = useState<CelebrationPhase>('idle');
  const [currentItem, setCurrentItem] = useState<BadgeCelebrationItem | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processingRef = useRef(false);

  // Initialize audio on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/audio/heart-coin.mp3');
    }
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  // Process next item in queue when idle
  useEffect(() => {
    if (phase !== 'idle' || !next || processingRef.current) return;

    processingRef.current = true;
    setCurrentItem(next);
    setPhase('badge');
    playSound();
  }, [next, phase, playSound]);

  // Handle phase transitions
  useEffect(() => {
    if (phase === 'idle' || !currentItem) return;

    let timeoutId: NodeJS.Timeout;

    if (phase === 'badge') {
      timeoutId = setTimeout(() => {
        // If heartcoins > 0, go to pause then heartcoin
        if (currentItem.heartCoins > 0) {
          setPhase('pause');
        } else {
          // No heartcoins, finish and pop
          setPhase('idle');
          setCurrentItem(null);
          processingRef.current = false;
          pop();
        }
      }, BADGE_DURATION);
    } else if (phase === 'pause') {
      timeoutId = setTimeout(() => {
        setPhase('heartcoin');
        playSound(); // Play sound again for heartcoin celebration
      }, PAUSE_DURATION);
    } else if (phase === 'heartcoin') {
      timeoutId = setTimeout(() => {
        setPhase('idle');
        setCurrentItem(null);
        processingRef.current = false;
        pop();
      }, HEARTCOIN_DURATION);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [phase, currentItem, pop, playSound]);

  // Don't render anything if not showing a celebration
  if (phase === 'idle' || phase === 'pause' || !currentItem) return null;

  // Badge celebration overlay
  if (phase === 'badge') {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none">
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
          {/* Neon glow circle behind icon */}
          <div
            className="absolute w-36 h-36 rounded-full blur-2xl opacity-50"
            style={{ background: 'radial-gradient(circle, rgba(79, 172, 254, 0.5) 0%, transparent 70%)' }}
          />

          {/* Badge icon */}
          <img
            src={currentItem.iconUrl}
            alt={currentItem.badgeName}
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
            {currentItem.badgeName}
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

  // HeartCoin celebration overlay
  if (phase === 'heartcoin') {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          style={{ animation: 'heartcoinFadeIn 0.3s ease-out' }}
        />

        {/* HeartCoin celebration content */}
        <div
          className="relative flex flex-col items-center px-10 py-8 rounded-2xl"
          style={{
            background: 'rgba(10, 10, 30, 0.85)',
            boxShadow: '0 0 40px rgba(252, 84, 175, 0.3), 0 0 80px rgba(252, 84, 175, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(252, 84, 175, 0.3)',
            animation: 'heartcoinPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          {/* Neon glow circle */}
          <div
            className="absolute w-40 h-40 rounded-full blur-2xl opacity-50"
            style={{ background: 'radial-gradient(circle, rgba(252, 84, 175, 0.5) 0%, transparent 70%)' }}
          />

          {/* HeartCoin icon */}
          <img
            src="/elements/heart-coin.webp"
            alt="HeartCoin"
            className="w-24 h-24 relative z-10"
            style={{
              filter: 'drop-shadow(0 0 15px rgba(252, 84, 175, 0.6))',
              animation: 'heartcoinPulse 1s ease-in-out infinite',
            }}
          />

          {/* Text: HeartCoins Awarded */}
          <p
            className="text-pink-400 text-sm font-semibold tracking-widest uppercase mt-4 relative z-10"
            style={{ textShadow: '0 0 10px rgba(252, 84, 175, 0.8)' }}
          >
            HeartCoins Awarded
          </p>

          {/* Amount */}
          <p
            className="text-white text-4xl font-bold mt-2 relative z-10"
            style={{ textShadow: '0 0 20px rgba(252, 84, 175, 0.5)' }}
          >
            +{currentItem.heartCoins}
          </p>
        </div>

        <style jsx>{`
          @keyframes heartcoinFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes heartcoinPopIn {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          @keyframes heartcoinPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
