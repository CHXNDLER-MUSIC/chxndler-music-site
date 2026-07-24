import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, phone_number, full_name, address_line1, address_line2, city, state, zip, country } = body;

    if (!email?.trim()) return NextResponse.json({ success: false, error: 'email is required' }, { status: 400 });
    if (!full_name?.trim()) return NextResponse.json({ success: false, error: 'full_name is required' }, { status: 400 });
    if (!address_line1?.trim()) return NextResponse.json({ success: false, error: 'address_line1 is required' }, { status: 400 });
    if (!city?.trim()) return NextResponse.json({ success: false, error: 'city is required' }, { status: 400 });
    if (!state?.trim()) return NextResponse.json({ success: false, error: 'state is required' }, { status: 400 });
    if (!zip?.trim()) return NextResponse.json({ success: false, error: 'zip is required' }, { status: 400 });
    if (!country?.trim()) return NextResponse.json({ success: false, error: 'country is required' }, { status: 400 });

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('orders')
      .insert({
        item_id: 'chxndler-card',
        item_name: 'CHXNDLER Card',
        email: email.trim(),
        phone_number: phone_number?.trim() || null,
        status: 'pending',
        total_heartcoins: 0,
        shipping_full_name: full_name.trim(),
        shipping_address_line1: address_line1.trim(),
        shipping_address_line2: address_line2?.trim() || null,
        shipping_city: city.trim(),
        shipping_state: state.trim(),
        shipping_zip: zip.trim(),
        shipping_country: country.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[order-chxndler] insert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order_id: data.id });
  } catch (err) {
    console.error('[order-chxndler] unexpected error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
