/**
 * Global mute gate for celebration audio.
 * Useful to avoid overlapping chimes during START/warp or app boot.
 */

declare global {
  interface Window { __MUTE_CELEBRATION_AUDIO_UNTIL?: number }
}

export function muteCelebrationAudio(durationMs: number = 6000): void {
  if (typeof window === 'undefined') return;
  try {
    window.__MUTE_CELEBRATION_AUDIO_UNTIL = Date.now() + Math.max(0, durationMs);
  } catch {}
}

export function isCelebrationAudioMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const until = window.__MUTE_CELEBRATION_AUDIO_UNTIL || 0;
    return Date.now() < until;
  } catch {
    return false;
  }
}

