import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public, non-sensitive: the enabled secondary payment destinations (Venmo).
// Editable entirely from the Supabase `tip_payment_methods` table.
export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('tip_payment_methods')
      .select('provider, button_label, public_url, display_handle, sort_order')
      .eq('enabled', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[tip/payment-methods] query error', error);
      return NextResponse.json({ methods: [] });
    }

    return NextResponse.json({ methods: data ?? [] });
  } catch (err) {
    console.error('[tip/payment-methods] error', err);
    return NextResponse.json({ methods: [] });
  }
}
