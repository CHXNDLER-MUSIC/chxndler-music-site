import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('orders')
      .select('id, shipping_full_name, created_at')
      .ilike('item_name', '%CHXNDLER Card%')
      .eq('is_winner', true)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ winner_exists: false, winner: null });
    }

    return NextResponse.json({
      winner_exists: true,
      winner: {
        id: data.id,
        shipping_full_name: data.shipping_full_name,
        created_at: data.created_at,
      },
    });
  } catch {
    return NextResponse.json({ winner_exists: false, winner: null });
  }
}
