'use client';

/**
 * Global celebration queue to coordinate celebrations across the app.
 * Ensures only one celebration shows at a time (badges, planet rewards, etc).
 */

type CelebrationType = 'badge' | 'planet_reward' | 'heartcoin';

interface CelebrationLock {
  type: CelebrationType;
  timestamp: number;
  duration: number;
}

// Simple in-memory state for the celebration lock
let currentLock: CelebrationLock | null = null;
const lockListeners: Set<() => void> = new Set();

const LOCK_TIMEOUT = 5000; // Default auto-release if not manually released, or if caller doesn't specify a duration

export function acquireCelebrationLock(type: CelebrationType, durationMs: number = LOCK_TIMEOUT): boolean {
  // Check if lock is held and not expired
  if (currentLock && Date.now() - currentLock.timestamp < currentLock.duration) {
    return false;
  }

  // Acquire the lock
  currentLock = { type, timestamp: Date.now(), duration: durationMs };
  notifyListeners();
  return true;
}

export function releaseCelebrationLock(type: CelebrationType): void {
  // Only release if we hold the lock
  if (currentLock?.type === type) {
    currentLock = null;
    notifyListeners();
  }
}

export function isCelebrationLockHeld(): boolean {
  if (!currentLock) return false;
  // Check if lock has expired
  if (Date.now() - currentLock.timestamp >= currentLock.duration) {
    currentLock = null;
    return false;
  }
  return true;
}

export function getCurrentLockType(): CelebrationType | null {
  if (!isCelebrationLockHeld()) return null;
  return currentLock?.type ?? null;
}

function notifyListeners() {
  lockListeners.forEach(listener => listener());
}

export function subscribeToCelebrationLock(listener: () => void): () => void {
  lockListeners.add(listener);
  return () => lockListeners.delete(listener);
}

// React hook for using the celebration lock
import { useState, useEffect, useCallback } from 'react';

export function useCelebrationLock(type: CelebrationType) {
  const [isLocked, setIsLocked] = useState(() => isCelebrationLockHeld());
  const [hasLock, setHasLock] = useState(false);

  useEffect(() => {
    const updateState = () => {
      setIsLocked(isCelebrationLockHeld());
      setHasLock(getCurrentLockType() === type);
    };

    const unsubscribe = subscribeToCelebrationLock(updateState);
    return unsubscribe;
  }, [type]);

  const acquire = useCallback(() => {
    const acquired = acquireCelebrationLock(type);
    if (acquired) {
      setHasLock(true);
    }
    return acquired;
  }, [type]);

  const release = useCallback(() => {
    releaseCelebrationLock(type);
    setHasLock(false);
  }, [type]);

  return {
    isLocked,
    hasLock,
    acquire,
    release,
    canAcquire: !isLocked || hasLock
  };
}
