import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { getStripe } from '@/lib/stripe/server';
import { DEFAULT_CAMPAIGN, DEFAULT_SOURCE } from '@/lib/tip/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stripe is the source of truth for money. A frontend "success" is not enough —
// tip_transactions is written only from here, after signature verification, and
// keyed on the PaymentIntent id so duplicate deliveries are no-ops.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[tip/webhook] missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('[tip/webhook] signature verification failed', err);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  try {
    if (
      event.type === 'payment_intent.succeeded' ||
      event.type === 'payment_intent.payment_failed'
    ) {
      const pi = event.data.object as Stripe.PaymentIntent;

      // Ignore anything that isn't one of our tips (e.g. merch, other flows).
      if (pi.metadata?.kind !== 'tip') {
        return NextResponse.json({ received: true, ignored: true });
      }

      const succeeded = event.type === 'payment_intent.succeeded';
      const status = succeeded ? 'succeeded' : 'failed';
      const sessionId = pi.metadata?.tip_session_id || null;
      const source = pi.metadata?.source || DEFAULT_SOURCE;
      const campaign = pi.metadata?.campaign || DEFAULT_CAMPAIGN;

      const admin = getSupabaseAdmin();

      // Idempotent: unique(stripe_payment_intent_id) + upsert on that column.
      const { error: txError } = await admin
        .from('tip_transactions')
        .upsert(
          {
            provider: 'stripe',
            stripe_payment_intent_id: pi.id,
            session_id: sessionId,
            amount_cents: typeof pi.amount_received === 'number' && pi.amount_received > 0
              ? pi.amount_received
              : pi.amount,
            currency: pi.currency || 'usd',
            status,
            source,
            campaign,
            metadata: {
              livemode: event.livemode,
              last_payment_error: pi.last_payment_error?.message ?? null,
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_payment_intent_id', ignoreDuplicates: false },
        );

      if (txError) {
        console.error('[tip/webhook] tip_transactions upsert failed', txError);
        // 500 → Stripe retries. Better than losing the record.
        return NextResponse.json({ error: 'db write failed' }, { status: 500 });
      }

      // Funnel event mirrors the confirmed outcome. Duplicate webhook
      // deliveries add a duplicate event row at worst; the money table stays
      // single. Guard against the obvious dupes by checking first.
      const { data: existingEvent } = await admin
        .from('tip_events')
        .select('id')
        .eq('stripe_payment_intent_id', pi.id)
        .eq('event_type', succeeded ? 'payment_completed' : 'payment_failed')
        .limit(1)
        .maybeSingle();

      if (!existingEvent) {
        await admin.from('tip_events').insert({
          session_id: sessionId,
          event_type: succeeded ? 'payment_completed' : 'payment_failed',
          amount_cents: pi.amount,
          source,
          campaign,
          provider: 'stripe',
          stripe_payment_intent_id: pi.id,
          metadata: { via: 'webhook', livemode: event.livemode },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[tip/webhook] handler error', err);
    return NextResponse.json({ error: 'handler error' }, { status: 500 });
  }
}
