// Lightweight debug logger gated by environment variable, localStorage, or URL param.
// Enable via:
//   - NEXT_PUBLIC_MEDIA_DEBUG=1 (env)
//   - localStorage.debug = "1" (persists across sessions)
//   - ?debug=1 in URL (one-time)
//   - window.__CHX_DEBUG = true (runtime)

export const DEBUG_MEDIA = process.env.NEXT_PUBLIC_MEDIA_DEBUG === '1';

// Check if debug mode is enabled (supports localStorage for persistence)
function isDebugEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const w = window as any;
    // Check cached value first
    if (typeof w.__CHX_DEBUG !== 'undefined') return !!w.__CHX_DEBUG;
    // Check localStorage
    const lsVal = localStorage.getItem('debug');
    if (lsVal === '1' || lsVal === 'true') {
      w.__CHX_DEBUG = true;
      return true;
    }
    // Check URL param
    const params = new URLSearchParams(window.location.search);
    const urlVal = (params.get('debug') || '').toLowerCase();
    const enabled = urlVal === '1' || urlVal === 'true' || urlVal === 'yes';
    w.__CHX_DEBUG = enabled;
    return enabled;
  } catch {
    return false;
  }
}

export function dlog(...args: any[]) {
  if ((!DEBUG_MEDIA && !isDebugEnabled()) || typeof window === 'undefined') return;
  try { console.debug('[media]', ...args); } catch {}
}

export function dwarn(...args: any[]) {
  if ((!DEBUG_MEDIA && !isDebugEnabled()) || typeof window === 'undefined') return;
  try { console.warn('[media]', ...args); } catch {}
}

export function dumpAudio(el: HTMLMediaElement | null | undefined, label = 'audio') {
  if ((!DEBUG_MEDIA && !isDebugEnabled()) || typeof window === 'undefined') return;
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
// Enable with URL `?debug=1`, localStorage.debug="1", or window.__CHX_DEBUG = true
export function isDebug(): boolean {
  return isDebugEnabled();
}

export function debugLog(...args: any[]) {
  if (!isDebugEnabled()) return;
  try { console.log(...args); } catch {}
}
