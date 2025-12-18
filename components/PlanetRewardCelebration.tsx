'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCelebrationLock } from '@/lib/celebrationQueue';
import { PlanetReward, BOOST_DESCRIPTIONS } from '@/lib/usePlanetRewards';

interface PlanetRewardCelebrationProps {
  reward: PlanetReward | null;
  onComplete: () => void;
}

const CELEBRATION_DURATION = 2400;

// Element colors for consistent theming
const ELEMENT_COLORS: Record<string, { primary: string; glow: string }> = {
  heart: { primary: '#FC54AF', glow: 'rgba(252, 84, 175, 0.5)' },
  water: { primary: '#38B6FF', glow: 'rgba(56, 182, 255, 0.5)' },
  lightning: { primary: '#F2EF1D', glow: 'rgba(242, 239, 29, 0.5)' },
  darkness: { primary: '#9C27B0', glow: 'rgba(156, 39, 176, 0.5)' },
};

export default function PlanetRewardCelebration({ reward, onComplete }: PlanetRewardCelebrationProps) {
  const { hasLock, acquire, release, canAcquire } = useCelebrationLock('planet_reward');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

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

  // Try to acquire lock and show celebration when reward is set
  useEffect(() => {
    if (!reward) {
      hasStartedRef.current = false;
      return;
    }

    // Already showing this reward
    if (hasStartedRef.current) return;

    // Try to acquire the lock
    if (!canAcquire) {
      // Wait for lock to become available
      const checkInterval = setInterval(() => {
        if (acquire()) {
          clearInterval(checkInterval);
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    if (acquire()) {
      hasStartedRef.current = true;
      playSound();

      // Auto-close after duration
      timeoutRef.current = setTimeout(() => {
        release();
        onComplete();
      }, CELEBRATION_DURATION);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [reward, canAcquire, acquire, release, onComplete, playSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (hasLock) {
        release();
      }
    };
  }, [hasLock, release]);

  // Don't render if no reward or we don't have the lock
  if (!reward || !hasLock) return null;

  const colors = ELEMENT_COLORS[reward.element] || ELEMENT_COLORS.heart;

  if (reward.type === 'RELIC') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          style={{ animation: 'planetRewardFadeIn 0.3s ease-out' }}
        />

        {/* Relic celebration content */}
        <div
          className="relative flex flex-col items-center px-10 py-8 rounded-2xl max-w-sm mx-4"
          style={{
            background: 'rgba(10, 10, 30, 0.9)',
            boxShadow: `0 0 40px ${colors.glow}, 0 0 80px ${colors.glow.replace('0.5', '0.2')}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
            border: `1px solid ${colors.primary}40`,
            animation: 'planetRewardPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          {/* Neon glow circle behind image */}
          <div
            className="absolute w-40 h-40 rounded-full blur-2xl opacity-60"
            style={{ background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)` }}
          />

          {/* Relic image */}
          <img
            src={reward.image_url || '/elements/relic-default.webp'}
            alt={reward.label}
            className="w-28 h-28 relative z-10 rounded-xl object-cover"
            style={{
              boxShadow: `0 0 25px ${colors.glow}`,
              animation: 'planetRewardPulse 1.5s ease-in-out infinite',
            }}
          />

          {/* Title: Relic Found */}
          <p
            className="text-sm font-semibold tracking-widest uppercase mt-5 relative z-10"
            style={{ color: colors.primary, textShadow: `0 0 10px ${colors.glow}` }}
          >
            Relic Found
          </p>

          {/* Relic label */}
          <p
            className="text-white text-xl font-bold mt-2 relative z-10 text-center"
            style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.3)' }}
          >
            {reward.label}
          </p>

          {/* Subtitle */}
          <p
            className="text-gray-400 text-sm mt-2 relative z-10 uppercase tracking-wide"
          >
            {reward.element.toUpperCase()} Planet Relic
          </p>
        </div>

        <style jsx>{`
          @keyframes planetRewardFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes planetRewardPopIn {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          @keyframes planetRewardPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  // BOOST celebration
  const boostDescription = BOOST_DESCRIPTIONS[reward.code] || 'Special boost activated!';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{ animation: 'boostFadeIn 0.3s ease-out' }}
      />

      {/* Boost celebration content */}
      <div
        className="relative flex flex-col items-center px-10 py-8 rounded-2xl max-w-sm mx-4"
        style={{
          background: 'rgba(10, 10, 30, 0.9)',
          boxShadow: `0 0 40px ${colors.glow}, 0 0 80px ${colors.glow.replace('0.5', '0.2')}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
          border: `1px solid ${colors.primary}40`,
          animation: 'boostPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        {/* Neon glow circle */}
        <div
          className="absolute w-36 h-36 rounded-full blur-2xl opacity-60"
          style={{ background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)` }}
        />

        {/* Boost icon - lightning bolt */}
        <div
          className="w-24 h-24 relative z-10 flex items-center justify-center text-5xl rounded-full"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}20, ${colors.primary}40)`,
            boxShadow: `0 0 25px ${colors.glow}`,
            animation: 'boostPulse 1s ease-in-out infinite',
          }}
        >
          ⚡
        </div>

        {/* Title: Signal Boost Unlocked */}
        <p
          className="text-sm font-semibold tracking-widest uppercase mt-5 relative z-10"
          style={{ color: colors.primary, textShadow: `0 0 10px ${colors.glow}` }}
        >
          Signal Boost Unlocked
        </p>

        {/* Boost label */}
        <p
          className="text-white text-lg font-bold mt-2 relative z-10 text-center"
          style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.3)' }}
        >
          {reward.label}
        </p>

        {/* Description */}
        <p className="text-gray-400 text-sm mt-3 relative z-10 text-center max-w-xs">
          {boostDescription}
        </p>
      </div>

      <style jsx>{`
        @keyframes boostFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes boostPopIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes boostPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
