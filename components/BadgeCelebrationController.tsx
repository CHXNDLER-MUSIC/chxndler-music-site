'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBadgeCelebrations, type BadgeCelebrationItem } from '@/lib/useBadgeCelebrations';
import { useAuth } from '@/app/providers/AuthProvider';
import { useCelebrationLock } from '@/lib/celebrationQueue';
import { isCelebrationAudioAllowed } from '@/utils/celebrationAudio';
import { isHeartcoinCelebrationActive, getHeartcoinCelebrationRemainingTime } from '@/utils/celebrationQueue';

type CelebrationPhase = 'idle' | 'badge';

const BADGE_DURATION = 1600;

export default function BadgeCelebrationController() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { next, pop } = useBadgeCelebrations(userId);
  const { acquire, release, canAcquire } = useCelebrationLock('badge');

  const [phase, setPhase] = useState<CelebrationPhase>('idle');
  const [currentItem, setCurrentItem] = useState<BadgeCelebrationItem | null>(null);
  const [mounted, setMounted] = useState(false);
  const badgeAudioRef = useRef<HTMLAudioElement | null>(null);
  const processingRef = useRef(false);

  // Track mount state for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Initialize audio on client (use distinct sound for badge, not heart-coin)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      badgeAudioRef.current = new Audio('/audio/card-ding.mp3');
    }
  }, []);

  const playBadgeSound = useCallback(() => {
    if (badgeAudioRef.current && isCelebrationAudioAllowed()) {
      badgeAudioRef.current.currentTime = 0;
      badgeAudioRef.current.play().catch(() => {});
    }
  }, []);

  // Process next item in queue when idle, HeartCoin celebration is done, and lock is available
  useEffect(() => {
    if (phase !== 'idle' || !next || processingRef.current) return;

    // Function to start the badge celebration
    const startBadgeCelebration = () => {
      if (acquire()) {
        processingRef.current = true;
        setCurrentItem(next);
        setPhase('badge');
        playBadgeSound();
        return true;
      }
      return false;
    };

    // Check if HeartCoin celebration is active - wait for it to finish
    if (isHeartcoinCelebrationActive()) {
      const remainingTime = getHeartcoinCelebrationRemainingTime();
      console.log('[BadgeCelebration] Waiting for HeartCoin celebration to finish', { remainingTime });

      const waitTimeout = setTimeout(() => {
        // After waiting, try to acquire lock and start
        if (!canAcquire) {
          // Start polling for lock availability
          const checkInterval = setInterval(() => {
            if (!isHeartcoinCelebrationActive() && acquire()) {
              clearInterval(checkInterval);
              startBadgeCelebration();
            }
          }, 100);
          // Store cleanup
          return () => clearInterval(checkInterval);
        }
        startBadgeCelebration();
      }, remainingTime + 300); // Add small buffer after HeartCoin celebration

      return () => clearTimeout(waitTimeout);
    }

    // No HeartCoin celebration active, try to acquire lock
    if (!canAcquire) {
      // Wait for lock - check again via interval
      const checkInterval = setInterval(() => {
        if (!isHeartcoinCelebrationActive() && acquire()) {
          clearInterval(checkInterval);
          startBadgeCelebration();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    startBadgeCelebration();
  }, [next, phase, playBadgeSound, canAcquire, acquire]);

  // Handle phase transitions
  useEffect(() => {
    if (phase === 'idle' || !currentItem) return;

    let timeoutId: NodeJS.Timeout;

    if (phase === 'badge') {
      timeoutId = setTimeout(() => {
        // Notify listeners that badge celebration finished (for tour, etc.)
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('badge:celebration-complete', {
              detail: { badgeTitle: currentItem.badgeName, badgeImage: currentItem.iconUrl }
            }));
          }
        } catch {}

        // Finish here regardless of heartCoins. The global HeartCoin celebration
        // will be triggered by the transaction logging path to avoid duplicates.
        setPhase('idle');
        setCurrentItem(null);
        processingRef.current = false;
        release();
        pop();
      }, BADGE_DURATION);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [phase, currentItem, pop, release]);

  // Don't render anything if not showing a celebration or not mounted
  if (!mounted || phase === 'idle' || !currentItem) return null;

  // Badge celebration overlay - render via portal to document.body
  if (phase === 'badge') {
    const celebrationContent = (
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 2147483646, isolation: 'isolate' }}
      >
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

    return createPortal(celebrationContent, document.body);
  }

  // HeartCoin celebration overlay
  if (phase === 'heartcoin') {
    return (
      <div className="fixed inset-0 z-[100000] flex items-center justify-center pointer-events-none">
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
