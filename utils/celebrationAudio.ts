/**
 * Celebration audio gate
 * - Disabled by default on first load
 * - Enabled via user gesture (e.g., START)
 * - Optional temporary mute window (e.g., during warp)
 */

declare global {
  interface Window {
    __MUTE_CELEBRATION_AUDIO_UNTIL?: number;
    __CELEBRATION_AUDIO_ENABLED?: boolean;
  }
}

// Initialize defaults on import (client-only)
if (typeof window !== 'undefined') {
  try {
    if (typeof window.__CELEBRATION_AUDIO_ENABLED !== 'boolean') {
      window.__CELEBRATION_AUDIO_ENABLED = false; // off until START
    }
    if (typeof window.__MUTE_CELEBRATION_AUDIO_UNTIL !== 'number') {
      window.__MUTE_CELEBRATION_AUDIO_UNTIL = 0;
    }
  } catch {}
}

export function enableCelebrationAudio() {
  if (typeof window === 'undefined') return;
  try { window.__CELEBRATION_AUDIO_ENABLED = true; } catch {}
}

export function disableCelebrationAudio() {
  if (typeof window === 'undefined') return;
  try { window.__CELEBRATION_AUDIO_ENABLED = false; } catch {}
}

export function muteCelebrationAudio(durationMs: number = 6000): void {
  if (typeof window === 'undefined') return;
  try {
    window.__MUTE_CELEBRATION_AUDIO_UNTIL = Date.now() + Math.max(0, durationMs);
  } catch {}
}

export function isCelebrationAudioAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const enabled = !!window.__CELEBRATION_AUDIO_ENABLED;
    const until = window.__MUTE_CELEBRATION_AUDIO_UNTIL || 0;
    const muted = Date.now() < until;
    return enabled && !muted;
  } catch {
    return false;
  }
}
