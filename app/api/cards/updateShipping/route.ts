import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  console.log('[updateShipping] POST request received');

  try {
    const body = await req.json();
    const {
      orderId,
      full_name,
      address_line1,
      address_line2,
      city,
      state,
      zip,
      country,
    } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId is required' },
        { status: 400 }
      );
    }
    if (!full_name || !full_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'full_name is required' },
        { status: 400 }
      );
    }
    if (!address_line1 || !address_line1.trim()) {
      return NextResponse.json(
        { success: false, error: 'address_line1 is required' },
        { status: 400 }
      );
    }
    if (!city || !city.trim()) {
      return NextResponse.json(
        { success: false, error: 'city is required' },
        { status: 400 }
      );
    }
    if (!state || !state.trim()) {
      return NextResponse.json(
        { success: false, error: 'state is required' },
        { status: 400 }
      );
    }
    if (!zip || !zip.trim()) {
      return NextResponse.json(
        { success: false, error: 'zip is required' },
        { status: 400 }
      );
    }
    if (!country || !country.trim()) {
      return NextResponse.json(
        { success: false, error: 'country is required' },
        { status: 400 }
      );
    }

    console.log('[updateShipping] Updating order:', orderId);

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('orders')
      .update({
        full_name: full_name.trim(),
        address_line1: address_line1.trim(),
        address_line2: address_line2?.trim() || null,
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        country: country.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('[updateShipping] supabase error', error);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      console.error('[updateShipping] supabase error', { message: 'No data returned' });
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log('[updateShipping] SUCCESS order:', orderId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[updateShipping] supabase error', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
