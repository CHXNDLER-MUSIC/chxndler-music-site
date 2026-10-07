import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getStripe } from '@/lib/stripe/server';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';
import { MERCH_MAX_QTY } from '@/lib/merch/constants';
import {
  TAX_ADDRESS_ERROR,
  calculateMerchTax,
  loadMerchForCheckout,
  readAddress,
  readQuantity,
  str,
} from '@/lib/merch/checkoutServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * In-site merch checkout (replaces opening the item's Stripe Payment Link).
 *
 * Given the item, quantity, colour and shipping address, this:
 *   1. loads the price from merch_items (the client price is never trusted),
 *   2. asks Stripe Tax for the sales tax at that address,
 *   3. creates a PaymentIntent for subtotal + tax (card fields or Apple Pay /
 *      Google Pay), carrying the shipping address and everything the webhook
 *      needs to record the order.
 *
 * Wallet checkouts pass `expectedTotalCents` (the total the buyer approved in
 * the Apple Pay / Google Pay sheet); if tax on the full address differs, no
 * PaymentIntent is created and the buyer is asked to review.
 *
 * The order itself is written only by the Stripe webhook after payment
 * succeeds (lib/merch/fulfillStripeOrder.ts) — never from here.
 */

async function optionalUserId(): Promise<string | null> {
  try {
    const token = (await cookies()).get('sb-access-token')?.value;
    if (!token) return null;
    const { data } = await createSupabaseServerClientWithJwt(token).auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const merchItemId = str(body?.merchItemId, 64);
    const quantity = readQuantity(body?.quantity);
    const color = str(body?.color, 60) || null;
    const email = str(body?.email, 254);
    const name = str(body?.name, 120);
    const phone = str(body?.phone, 40) || undefined;
    const address = readAddress(body?.address, true);
    const expectedTotalCents = Number.isInteger(body?.expectedTotalCents) ? Number(body.expectedTotalCents) : null;

    if (!merchItemId) return NextResponse.json({ error: 'Missing item.' }, { status: 400 });
    if (!quantity) return NextResponse.json({ error: `Quantity must be 1–${MERCH_MAX_QTY}.` }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email for your receipt.' }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: 'Enter the name for shipping.' }, { status: 400 });
    if (!address) return NextResponse.json({ error: 'Enter a complete shipping address.' }, { status: 400 });

    const item = await loadMerchForCheckout(merchItemId);
    if (!item) {
      return NextResponse.json({ error: 'That item is not available for purchase right now.' }, { status: 404 });
    }

    let quote;
    try {
      quote = await calculateMerchTax(item, quantity, address);
    } catch (err) {
      console.error('[merch/checkout] tax calculation failed', (err as { message?: string })?.message);
      return NextResponse.json({ error: TAX_ADDRESS_ERROR }, { status: 400 });
    }

    if (expectedTotalCents !== null && expectedTotalCents !== quote.totalCents) {
      return NextResponse.json(
        {
          error: 'Tax for your full address came out different from the estimate. Please review the new total and try again.',
          code: 'total_changed',
          totalCents: quote.totalCents,
        },
        { status: 409 },
      );
    }

    const userId = await optionalUserId();

    const intent = await getStripe().paymentIntents.create({
      amount: quote.totalCents,
      currency: 'usd',
      // Card fields + Apple Pay / Google Pay; no redirect-based methods
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      receipt_email: email,
      description: `CHXNDLER merch: ${item.name}${quantity > 1 ? ` ×${quantity}` : ''}${color ? ` (${color})` : ''}`,
      shipping: { name, phone, address: { ...address, line1: address.line1! } },
      metadata: {
        kind: 'merch',
        merch_item_id: item.id,
        item_name: item.name,
        quantity: String(quantity),
        color: color ?? '',
        unit_cents: String(item.unitCents),
        subtotal_cents: String(quote.subtotalCents),
        tax_cents: String(quote.taxCents),
        tax_calculation: quote.calculationId,
        user_id: userId ?? '',
        email,
      },
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      subtotalCents: quote.subtotalCents,
      taxCents: quote.taxCents,
      totalCents: quote.totalCents,
    });
  } catch (err) {
    console.error('[merch/checkout] error', err);
    return NextResponse.json({ error: 'Checkout setup failed. Please try again.' }, { status: 500 });
  }
}
