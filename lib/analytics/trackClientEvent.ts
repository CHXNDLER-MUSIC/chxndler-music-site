/**
 * trackClientEvent - Explicit client-side analytics tracking helper
 *
 * This helper ensures all tracked events have explicit action values
 * populated in payload.action so the backend can populate events.action column.
 *
 * Use this for:
 * - Navigation clicks (nav_about, nav_journey, etc.)
 * - Outbound clicks (outbound_spotify, outbound_apple_music, etc.)
 * - Start button clicks
 * - Livestream button clicks
 */

const SESSION_KEY = 'chx_session_id';

// Generate UUID using crypto API with fallback
function generateUuid(): string {
  try {
    return ([1e7] as any + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: string) =>
      (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
    );
  } catch {
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
  }
}

// Get or create session ID (persisted in localStorage)
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '00000000-0000-0000-0000-000000000000';

  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = generateUuid();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Fallback to sessionStorage if localStorage fails
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = generateUuid();
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch {
      return generateUuid();
    }
  }
}

// Action types for type safety
export type NavAction =
  | 'nav_about'
  | 'nav_journey'
  | 'nav_binder'
  | 'nav_badges'
  | 'nav_journal'
  | 'nav_store';

export type OutboundAction =
  | 'outbound_spotify'
  | 'outbound_apple_music'
  | 'outbound_youtube'
  | 'outbound_tiktok'
  | 'outbound_instagram';

export type ActionType = NavAction | OutboundAction | 'start' | 'livestream';

export type EventScope = 'global' | 'song';

export type Platform = 'spotify' | 'apple_music' | 'youtube' | 'tiktok' | 'instagram';

export interface TrackClientEventParams {
  /** Event type (e.g., 'nav_click', 'outbound_click', 'start_click', 'livestream_click') */
  event_type: string;

  /** REQUIRED: The action value to populate events.action column */
  action: ActionType;

  /** Optional song slug for song-specific events */
  song_slug?: string;

  /** Platform for outbound clicks */
  platform?: Platform;

  /** Scope: 'global' for comms hub, 'song' for song-specific buttons */
  scope?: EventScope;

  /** Destination URL for outbound clicks */
  url?: string;

  /** Optional user ID if logged in */
  user_id?: string | null;

  /** Additional payload data */
  extra?: Record<string, any>;
}

/**
 * Track a client event with explicit action value.
 * Uses sendBeacon for reliability (fires even during navigation).
 * Falls back to fetch with keepalive.
 */
export function trackClientEvent(params: TrackClientEventParams): void {
  if (typeof window === 'undefined') return;

  const {
    event_type,
    action,
    song_slug,
    platform,
    scope,
    url,
    user_id,
    extra = {}
  } = params;

  const session_id = getOrCreateSessionId();
  const page = window.location.pathname + window.location.search;
  const referrer = document.referrer || '';
  const user_agent = navigator.userAgent;

  // Build payload with action ALWAYS included
  const payload: Record<string, any> = {
    action, // CRITICAL: This gets copied to events.action by backend
    ...extra
  };

  // Add platform/scope/url for outbound clicks
  if (platform) payload.platform = platform;
  if (scope) payload.scope = scope;
  if (url) payload.url = url;
  if (song_slug) payload.song_slug = song_slug;

  const body: Record<string, any> = {
    session_id,
    event_type,
    page,
    referrer,
    payload,
    user_agent
  };

  // Add song_slug at top level for song-specific events
  if (song_slug) {
    body.song_slug = song_slug;
  }

  // Add user_id if provided
  if (user_id) {
    body.user_id = user_id;
  }

  // Try sendBeacon first (most reliable for navigation)
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      const ok = navigator.sendBeacon('/api/track', blob);
      if (ok) return;
    }
  } catch {}

  // Fallback to fetch with keepalive
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(body)
    }).catch(() => {});
  } catch {}
}

/**
 * Track a navigation click with proper action value
 */
export function trackNavClick(
  navItem: 'about' | 'journey' | 'binder' | 'badges' | 'journal' | 'store',
  user_id?: string | null
): void {
  const actionMap: Record<string, NavAction> = {
    about: 'nav_about',
    journey: 'nav_journey',
    binder: 'nav_binder',
    badges: 'nav_badges',
    journal: 'nav_journal',
    store: 'nav_store'
  };

  trackClientEvent({
    event_type: 'nav_click',
    action: actionMap[navItem],
    user_id
  });
}

/**
 * Track an outbound click (social media / streaming platforms)
 */
export function trackOutboundClick(params: {
  platform: Platform;
  url: string;
  scope: EventScope;
  song_slug?: string;
  user_id?: string | null;
}): void {
  const { platform, url, scope, song_slug, user_id } = params;

  const actionMap: Record<Platform, OutboundAction> = {
    spotify: 'outbound_spotify',
    apple_music: 'outbound_apple_music',
    youtube: 'outbound_youtube',
    tiktok: 'outbound_tiktok',
    instagram: 'outbound_instagram'
  };

  trackClientEvent({
    event_type: 'outbound_click',
    action: actionMap[platform],
    platform,
    scope,
    url,
    song_slug: scope === 'song' ? song_slug : undefined,
    user_id
  });
}

/**
 * Track the START button click
 */
export function trackStartClick(user_id?: string | null): void {
  trackClientEvent({
    event_type: 'start_click',
    action: 'start',
    user_id
  });
}

/**
 * Track the livestream button click
 */
export function trackLivestreamClick(user_id?: string | null): void {
  trackClientEvent({
    event_type: 'livestream_click',
    action: 'livestream',
    user_id
  });
}

/**
 * Helper to fire tracking BEFORE navigation and then navigate
 * Use for outbound links to ensure tracking fires before leaving the page
 */
export function trackAndNavigate(
  trackingParams: TrackClientEventParams,
  destinationUrl: string,
  openInNewTab: boolean = true
): void {
  // Fire tracking first
  trackClientEvent(trackingParams);

  // Small delay to ensure beacon fires, then navigate
  setTimeout(() => {
    if (openInNewTab) {
      window.open(destinationUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = destinationUrl;
    }
  }, 150);
}
