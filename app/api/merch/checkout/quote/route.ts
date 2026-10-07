import { NextResponse, type NextRequest } from 'next/server';
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
 * Tax estimate for the Apple Pay / Google Pay sheet. Wallets reveal only a
 * partial address (country, postal code, city, state) until the buyer approves,
 * so this accepts that and returns subtotal / tax / total. Creates no payment.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const quantity = readQuantity(body?.quantity);
    const address = readAddress(body?.address, false);
    if (!quantity) return NextResponse.json({ error: `Quantity must be 1–${MERCH_MAX_QTY}.` }, { status: 400 });
    if (!address) return NextResponse.json({ error: 'Address needs a country and postal code.' }, { status: 400 });

    const item = await loadMerchForCheckout(str(body?.merchItemId, 64));
    if (!item) {
      return NextResponse.json({ error: 'That item is not available for purchase right now.' }, { status: 404 });
    }

    try {
      const { subtotalCents, taxCents, totalCents } = await calculateMerchTax(item, quantity, address);
      return NextResponse.json({ subtotalCents, taxCents, totalCents });
    } catch (err) {
      console.error('[merch/quote] tax calculation failed', (err as { message?: string })?.message);
      return NextResponse.json({ error: TAX_ADDRESS_ERROR }, { status: 400 });
    }
  } catch (err) {
    console.error('[merch/quote] error', err);
    return NextResponse.json({ error: 'Could not estimate tax. Please try again.' }, { status: 500 });
  }
}
