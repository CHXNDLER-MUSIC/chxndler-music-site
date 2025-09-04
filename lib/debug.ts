// Lightweight debug logger gated by NEXT_PUBLIC_MEDIA_DEBUG
export const DEBUG_MEDIA = process.env.NEXT_PUBLIC_MEDIA_DEBUG === '1';

export function dlog(...args: any[]) {
  if (!DEBUG_MEDIA || typeof window === 'undefined') return;
  try { console.log('[media]', ...args); } catch {}
}

export function dwarn(...args: any[]) {
  if (!DEBUG_MEDIA || typeof window === 'undefined') return;
  try { console.warn('[media]', ...args); } catch {}
}

export function dumpAudio(el: HTMLMediaElement | null | undefined, label = 'audio') {
  if (!DEBUG_MEDIA || typeof window === 'undefined') return;
  try {
    if (!el) { console.log('[media]', label, 'el=null'); return; }
    const o = {
      srcAttr: el.getAttribute('src'),
      currentSrc: el.currentSrc,
      paused: el.paused,
      muted: el.muted,
      volume: el.volume,
      readyState: el.readyState,
      networkState: el.networkState,
      currentTime: el.currentTime,
      error: (el.error && (el.error as any).message) || (el.error && (el.error as any).code) || null,
    };
    console.log('[media]', `${label}:`, o);
  } catch {}
}

