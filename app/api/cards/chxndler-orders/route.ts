import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@chxndler-music.com';

export async function GET() {
  try {
    const cookieStore = await cookies();

    let userEmail: string | null = null;
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll(cookiesToSet) {
              try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
            },
          },
        }
      );
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email || null;
    } catch {}

    const isAdmin = userEmail === ADMIN_EMAIL;

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('orders')
      .select('id, shipping_full_name, created_at, email, is_winner')
      .ilike('item_name', '%CHXNDLER Card%')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[chxndler-orders]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orders = (data || []).map(order => ({
      id: order.id,
      // Winner name is always visible so everyone sees who found the signal
      shipping_full_name: (isAdmin || (userEmail && order.email === userEmail) || order.is_winner)
        ? order.shipping_full_name
        : null,
      created_at: order.created_at,
      is_winner: order.is_winner ?? false,
    }));

    return NextResponse.json(orders);
  } catch (err) {
    console.error('[chxndler-orders] unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
