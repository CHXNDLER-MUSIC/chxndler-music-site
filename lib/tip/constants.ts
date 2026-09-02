// Shared, non-sensitive constants for the /tip experience.
// Safe to import from both client and server code.

export const TIP_PRESETS_CENTS = [100, 300, 500, 1000] as const;

// Whole-dollar bounds for the OTHER AMOUNT field. Enforced again on the server
// in lib/stripe/server.ts — the client value is never trusted.
export const TIP_MIN_DOLLARS = 1;
export const TIP_MAX_DOLLARS = 500;

export const TIP_EVENTS = [
  'tip_page_view',
  'amount_selected',
  'other_amount_selected',
  'payment_started',
  'payment_completed',
  'payment_failed',
  'venmo_clicked',
  'heartverse_welcome_viewed',
  'heartverse_enter_clicked',
  'tip_error',
] as const;

export type TipEvent = (typeof TIP_EVENTS)[number];

export function isTipEvent(value: unknown): value is TipEvent {
  return typeof value === 'string' && (TIP_EVENTS as readonly string[]).includes(value);
}

export const DEFAULT_SOURCE = 'direct';
export const DEFAULT_CAMPAIGN = 'none';

// sessionStorage flag the homepage (DashboardApp) already reads on mount to
// auto-run the START warp. Setting this then navigating to "/" reuses the
// exact same entry sequence as the homepage START button.
export const HOMEPAGE_WARP_FLAG = 'chx_login_warp';

// sessionStorage flag set the moment a tip payment is confirmed. While it is
// present, /tip shows the Heartverse warp screen instead of the amount picker,
// so a refresh or Back navigation after paying can never drop the visitor into
// a fresh tipping flow (and never fires another PaymentIntent). It lives only
// for the tab session, so a genuinely new visit later starts fresh.
export const TIP_PAID_FLAG = 'chx_tip_paid';
