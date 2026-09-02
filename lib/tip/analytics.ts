'use client';

import type { TipEvent } from './constants';
import { getTipSession } from './session';

type TrackProps = {
  amountCents?: number;
  provider?: string;
  stripePaymentIntentId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Best-effort first-party analytics. Never throws, never blocks the UI —
 * a failed beacon must not get between a visitor and their tip.
 */
export async function trackTipEvent(event: TipEvent, props: TrackProps = {}): Promise<void> {
  try {
    const s = getTipSession();
    const body = JSON.stringify({
      sessionId: s.id,
      event,
      source: s.source,
      campaign: s.campaign,
      referrer: s.referrer,
      device: s.device,
      browser: s.browser,
      amountCents: props.amountCents,
      provider: props.provider,
      stripePaymentIntentId: props.stripePaymentIntentId,
      metadata: props.metadata ?? {},
    });

    await fetch('/api/tip/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // swallow — analytics is not load-bearing
  }
}
