import { createHash } from 'crypto';
import type Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { getStripe } from '@/lib/stripe/server';
import { emailService } from '@/lib/emailService';

// Server-only. Records a paid in-site merch card order (PaymentIntents created by
// /api/merch/checkout, metadata.kind === 'merch'). Called from the Stripe webhook.

/** Stable UUID for a PaymentIntent, so the order row's primary key makes
 * duplicate webhook deliveries a no-op (orders.id is a uuid column). */
function orderIdForPaymentIntent(piId: string): string {
  const h = createHash('sha1').update(`chx-merch-order:${piId}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Returns normally when the order is recorded, already recorded, or can never be
 * recorded (bad data — logged loudly; the payment is still safe in Stripe).
 * Throws only on transient failures, so the webhook answers 500 and Stripe retries.
 */
export async function fulfillStripeMerchOrder(pi: Stripe.PaymentIntent, livemode: boolean): Promise<void> {
  const md = pi.metadata || {};
  const ship = pi.shipping;
  const orderId = orderIdForPaymentIntent(pi.id);
  const quantity = Math.max(1, parseInt(md.quantity || '1', 10) || 1);
  const amountCents = pi.amount_received > 0 ? pi.amount_received : pi.amount;
  const email = pi.receipt_email || md.email || null;

  // Record the sale with Stripe Tax so it counts toward tax reporting.
  // Reference is unique per PaymentIntent, so a retry just fails harmlessly.
  if (md.tax_calculation) {
    try {
      await getStripe().tax.transactions.createFromCalculation({
        calculation: md.tax_calculation,
        reference: pi.id,
        metadata: { merch_order_id: orderId },
      });
    } catch (err) {
      const msg = (err as { message?: string })?.message || String(err);
      if (!/already|exists|reference/i.test(msg)) {
        console.error('[merch/webhook] tax transaction failed (order still recorded)', pi.id, msg);
      }
    }
  }

  const row = {
    id: orderId,
    user_id: md.user_id || null,
    order_type: 'merch',
    payment_type: 'stripe',
    status: 'paid',
    item_id: md.item_name || 'merch',
    item_name: md.item_name || 'Merch',
    merch_item_id: md.merch_item_id || null,
    quantity,
    price_heartcoins: 0,
    total_heartcoins: 0,
    selected_color: md.color || null,
    selected_variant: {
      payment: 'stripe_card',
      stripe_payment_intent_id: pi.id,
      amount_total_cents: amountCents,
      subtotal_cents: Number(md.subtotal_cents) || null,
      tax_cents: Number(md.tax_cents) || 0,
      unit_cents: Number(md.unit_cents) || null,
      currency: pi.currency,
      color: md.color || null,
      livemode,
    },
    email,
    phone_number: ship?.phone || null,
    requires_shipping: true,
    is_shipping_required: true,
    shipping_submitted: true,
    shipping_full_name: ship?.name || null,
    shipping_address_line1: ship?.address?.line1 || null,
    shipping_address_line2: ship?.address?.line2 || null,
    shipping_city: ship?.address?.city || null,
    shipping_state: ship?.address?.state || null,
    shipping_zip: ship?.address?.postal_code || null,
    shipping_country: ship?.address?.country || null,
  };

  const { error } = await getSupabaseAdmin().from('orders').insert(row);

  if (error) {
    if (error.code === '23505') return; // already recorded (duplicate delivery)
    // 22xxx = bad data, 23xxx = constraint: retrying can never succeed.
    if (error.code && /^2[23]/.test(error.code)) {
      console.error('[merch/webhook] ORDER NOT RECORDED — fix and add manually. Payment is in Stripe.', {
        paymentIntent: pi.id,
        error,
        row,
      });
      return;
    }
    throw new Error(`orders insert failed: ${error.message}`);
  }

  // New order only — confirmation email (failure never blocks the order)
  if (email) {
    try {
      await emailService.sendOrderConfirmation({
        orderId,
        customerName: ship?.name || 'HEARTVERSE Member',
        customerEmail: email,
        itemName: `${row.item_name}${quantity > 1 ? ` ×${quantity}` : ''}${row.selected_color ? ` (${row.selected_color})` : ''}`,
        heartCoinsSpent: 0,
        amountPaidLabel: usd(amountCents),
        isPhysicalItem: true,
        shippingAddress: ship?.address
          ? {
              fullName: ship.name || '',
              addressLine1: ship.address.line1 || '',
              addressLine2: ship.address.line2 || '',
              city: ship.address.city || '',
              state: ship.address.state || '',
              zip: ship.address.postal_code || '',
              country: ship.address.country || '',
            }
          : undefined,
      });
    } catch (err) {
      console.error('[merch/webhook] confirmation email failed', pi.id, err);
    }
  }
}
