// Lightweight debug logger gated by NEXT_PUBLIC_MEDIA_DEBUG
export const DEBUG_MEDIA = process.env.NEXT_PUBLIC_MEDIA_DEBUG === '1';

export function dlog(...args: any[]) {
  if (!DEBUG_MEDIA || typeof window === 'undefined') return;
  try { console.debug('[media]', ...args); } catch {}
}

export function dwarn(...args: any[]) {
  if (!DEBUG_MEDIA || typeof window === 'undefined') return;
  try { console.warn('[media]', ...args); } catch {}
}

export function dumpAudio(el: HTMLMediaElement | null | undefined, label = 'audio') {
  if (!DEBUG_MEDIA || typeof window === 'undefined') return;
  try {
    if (!el) { console.debug('[media]', label, 'el=null'); return; }
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
    console.debug('[media]', `${label}:`, o);
  } catch {}
}

// Generic debug gate to keep console clean by default.
// Enable with URL `?debug=1` or by setting `window.__CHX_DEBUG = true`.
export function isDebug(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const w = window as any;
    if (typeof w.__CHX_DEBUG !== 'undefined') return !!w.__CHX_DEBUG;
    const params = new URLSearchParams(window.location.search);
    const val = (params.get('debug') || '').toLowerCase();
    const enabled = val === '1' || val === 'true' || val === 'yes';
    w.__CHX_DEBUG = enabled;
    return enabled;
  } catch {
    return false;
  }
}

export function debugLog(...args: any[]) {
  if (!isDebug()) return;
  try { console.log(...args); } catch {}
}
