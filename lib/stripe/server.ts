import Stripe from 'stripe';
import { TIP_MAX_DOLLARS, TIP_MIN_DOLLARS } from '@/lib/tip/constants';

export { TIP_MAX_DOLLARS, TIP_MIN_DOLLARS };

// Server-only Stripe client.
// NEVER import this from a client component — it reads STRIPE_SECRET_KEY.

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripe) return stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  // Pin nothing here: stripe-node defaults to the API version its major
  // release is built against, which keeps the types in sync with the SDK.
  stripe = new Stripe(secretKey, {
    appInfo: { name: 'chxndler-music-site/tip' },
  });

  return stripe;
}

// Amount is validated against these bounds on the server before any
// PaymentIntent is created — the client value is never trusted.
export function validateTipDollars(input: unknown): { ok: true; cents: number } | { ok: false; error: string } {
  const n = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(n)) return { ok: false, error: 'Enter a valid amount.' };
  if (!Number.isInteger(n)) return { ok: false, error: 'Whole dollar amounts only.' };
  if (n < TIP_MIN_DOLLARS) return { ok: false, error: `Minimum tip is $${TIP_MIN_DOLLARS}.` };
  if (n > TIP_MAX_DOLLARS) return { ok: false, error: `Maximum tip is $${TIP_MAX_DOLLARS}.` };
  return { ok: true, cents: Math.round(n * 100) };
}
