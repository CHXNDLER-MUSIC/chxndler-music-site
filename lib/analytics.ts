const KEY = 'chx_session_id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '00000000-0000-0000-0000-000000000000';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = ([1e7]+-1e3+-4e3+-8e3+-1e11 as any).replace(/[018]/g, (c: string) =>
      (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
    );
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function track(
  event_type: string,
  data: { page?: string; referrer?: string; song_slug?: string; payload?: any } = {}
) {
  if (typeof window === 'undefined') return;

  const session_id = getOrCreateSessionId();
  const page = data.page || window.location.pathname + window.location.search;
  const referrer = data.referrer || document.referrer || '';

  fetch('/api/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      session_id,
      event_type,
      page,
      referrer,
      song_slug: data.song_slug,
      payload: data.payload ?? null,
    }),
  }).catch(() => {});
}

export function trackPageView() {
  track('page_view');
}

// Music-specific tracking functions
export function trackSongSelected(song_slug: string, song_title?: string) {
  track('song_selected', { 
    song_slug, 
    payload: { song_title } 
  });
}

export function trackCoverArtClicked(song_slug: string, song_title?: string) {
  track('cover_art_clicked', { 
    song_slug, 
    payload: { song_title } 
  });
}

export function trackSongHovered(song_slug: string, hover_method?: string) {
  track('song_hovered', { 
    song_slug, 
    payload: { hover_method } 
  });
}

export function trackMusicStarted() {
  track('music_started');
}

// Click tracking types
export interface ClickData {
  id: string;
  timestamp: number;
  element: {
    tagName: string;
    className: string;
    id: string;
    textContent: string;
    href?: string;
    role?: string;
    ariaLabel?: string;
    dataId?: string;
  };
  position: {
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  };
  viewport: {
    width: number;
    height: number;
  };
  page: {
    url: string;
    title: string;
  };
  userAgent: string;
  enhancedLabel?: string;
}

// Click tracking functions
export function generateClickId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Legacy trackClick function (keeping for compatibility)
export function trackClickLegacy(element: HTMLElement, clickId: string) {
  if (!element || !element.tagName) return;
  
  track('click', {
    payload: {
      element_tag: element.tagName.toLowerCase(),
      element_class: element.className,
      element_text: element.textContent?.slice(0, 100),
      click_id: clickId
    }
  });
}

// New trackClick function that accepts ClickData
export function trackClick(clickData: ClickData) {
  track('click', {
    payload: {
      element_tag: clickData.element.tagName,
      element_class: clickData.element.className,
      element_text: clickData.element.textContent,
      click_id: clickData.id,
      position: clickData.position,
      viewport: clickData.viewport,
      page: clickData.page,
      user_agent: clickData.userAgent
    }
  });
}

// Local storage constants
const CLICKS_STORAGE_KEY = 'chx_click_analytics';
const MAX_CLICKS = 1000;

// Client-side click analytics functions for dashboard
export function getClickAnalyticsLocal(): ClickData[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CLICKS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load click analytics from localStorage:', error);
    return [];
  }
}

export function storeClickData(clickData: ClickData) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getClickAnalyticsLocal();
    existing.push(clickData);
    
    // Keep only the most recent clicks
    if (existing.length > MAX_CLICKS) {
      existing.splice(0, existing.length - MAX_CLICKS);
    }
    
    localStorage.setItem(CLICKS_STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('Failed to store click analytics:', error);
  }
}

export function clearClickAnalyticsLocal() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CLICKS_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear click analytics:', error);
  }
}

// Server-side analytics functions (for admin dashboard)
export async function getMusicAnalytics() {
  // This would typically make an API call to your backend
  return { success: false, error: 'Not implemented - use API directly' };
}

export async function getClickAnalytics() {
  return { success: false, error: 'Not implemented - use API directly' };
}

export async function clearClickAnalytics() {
  return { success: false, error: 'Not implemented - use API directly' };
}