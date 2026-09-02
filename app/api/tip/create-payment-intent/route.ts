import { NextResponse, type NextRequest } from 'next/server';
import { getStripe, validateTipDollars } from '@/lib/stripe/server';
import { DEFAULT_CAMPAIGN, DEFAULT_SOURCE } from '@/lib/tip/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The tip UI drives its own method selector, so every PaymentIntent is created
// for exactly ONE method. That makes the embedded element render only that
// method's form — no Stripe tab strip, so no "Bank", and no Link box bleeding
// into the card form.
const ALLOWED_METHODS = ['card', 'cashapp', 'link'] as const;
type TipMethod = (typeof ALLOWED_METHODS)[number];

// Each chip maps to a minimal method set. Card is card-only (so the element
// shows no tab strip → no "Bank", no Link box). Link needs `card` as its
// required co-type, but the Link panel orders Link first.
const METHOD_TYPES: Record<TipMethod, string[]> = {
  card: ['card'],
  cashapp: ['cashapp'],
  link: ['link', 'card'],
};

function clampStr(v: unknown, max: number, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const t = v.trim();
  if (!t) return fallback;
  return t.slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      return NextResponse.json(
        { error: 'Payments are not configured yet.' },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = clampStr(body?.sessionId, 80, 'ts_unknown');
    const source = clampStr(body?.source, 120, DEFAULT_SOURCE);
    const campaign = clampStr(body?.campaign, 120, DEFAULT_CAMPAIGN);
    const method: TipMethod = ALLOWED_METHODS.includes(body?.method) ? body.method : 'card';

    // Never trust the client amount — validate whole-dollar bounds here.
    const check = validateTipDollars(body?.amountDollars);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const stripe = getStripe();
    const baseParams = {
      amount: check.cents,
      currency: 'usd' as const,
      description: 'CHXNDLER tip',
      statement_descriptor_suffix: 'TIP',
      metadata: {
        kind: 'tip',
        tip_session_id: sessionId,
        source,
        campaign,
        method,
      },
    };

    let intent;
    try {
      intent = await stripe.paymentIntents.create({
        ...baseParams,
        payment_method_types: METHOD_TYPES[method],
      });
    } catch (err) {
      // Method not enabled on the account → fall back to card so the flow works.
      if (method === 'card') throw err;
      console.warn(`[tip/create-payment-intent] "${method}" rejected, falling back to card`, err);
      intent = await stripe.paymentIntents.create({
        ...baseParams,
        payment_method_types: ['card'],
      });
    }

    console.log(
      '[tip/create-payment-intent] created',
      intent.id,
      'requested=',
      method,
      'methods=',
      JSON.stringify(intent.payment_method_types),
    );

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amountCents: check.cents,
      method,
      // Diagnostic: the exact method list on the created intent. A card panel
      // showing a "Bank" tab means the running server is NOT on this code.
      methods: intent.payment_method_types,
    });
  } catch (err) {
    console.error('[tip/create-payment-intent] error', err);
    return NextResponse.json(
      { error: 'We couldn’t start the payment. Please try again.' },
      { status: 500 },
    );
  }
}
