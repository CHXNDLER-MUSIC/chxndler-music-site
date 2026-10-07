import { getStripe } from '@/lib/stripe/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { MERCH_MAX_QTY } from '@/lib/merch/constants';

// Server-only helpers shared by /api/merch/checkout and /api/merch/checkout/quote.

export type CheckoutAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code: string;
  country: string;
};

export type MerchForCheckout = { id: string; name: string; unitCents: number };

export function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/** Parses an address. `full` requires street + city (for shipping); otherwise
 * country + postal code is enough (wallet sheets share only a partial address
 * until the buyer approves). */
export function readAddress(raw: unknown, full: boolean): CheckoutAddress | null {
  const a = (raw ?? {}) as Record<string, unknown>;
  const address: CheckoutAddress = {
    line1: str(a.line1, 200) || undefined,
    line2: str(a.line2, 200) || undefined,
    city: str(a.city, 100) || undefined,
    state: str(a.state, 100) || undefined,
    postal_code: str(a.postal_code ?? a.postalCode, 20),
    country: str(a.country, 2).toUpperCase(),
  };
  if (!address.postal_code || address.country.length !== 2) return null;
  if (full && (!address.line1 || !address.city)) return null;
  return address;
}

export function readQuantity(raw: unknown): number | null {
  const q = Number(raw);
  return Number.isInteger(q) && q >= 1 && q <= MERCH_MAX_QTY ? q : null;
}

/** Loads the item's price from merch_items — the client price is never trusted. */
export async function loadMerchForCheckout(merchItemId: string): Promise<MerchForCheckout | null> {
  if (!merchItemId) return null;
  const { data: item, error } = await getSupabaseAdmin()
    .from('merch_items')
    .select('id, name, cost_usd, is_active, is_available')
    .eq('id', merchItemId)
    .maybeSingle();
  if (error) throw new Error(`merch lookup failed: ${error.message}`);
  const unitCents = Math.round(Number(item?.cost_usd) * 100);
  if (!item || !item.is_active || item.is_available === false || !Number.isFinite(unitCents) || unitCents <= 0) {
    return null;
  }
  return { id: item.id, name: item.name, unitCents };
}

/** Sales tax at this address via Stripe Tax (same automatic tax the Payment Links used). */
export async function calculateMerchTax(item: MerchForCheckout, quantity: number, address: CheckoutAddress) {
  const subtotalCents = item.unitCents * quantity;
  const calculation = await getStripe().tax.calculations.create({
    currency: 'usd',
    line_items: [
      { amount: subtotalCents, quantity, reference: `merch:${item.id}`, tax_behavior: 'exclusive' },
    ],
    customer_details: { address, address_source: 'shipping' },
  });
  return {
    calculationId: calculation.id ?? '',
    subtotalCents,
    taxCents: calculation.tax_amount_exclusive,
    totalCents: calculation.amount_total,
  };
}

export const TAX_ADDRESS_ERROR = 'We couldn’t verify that address for tax. Please check it and try again.';
