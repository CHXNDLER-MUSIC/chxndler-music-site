import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use anon key for public read - this endpoint returns today's element for anyone
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/element-of-day
 *
 * Returns today's element using SERVER time in America/New_York timezone.
 * This ensures the frontend always uses the same "today" as the backend RPC.
 *
 * Response:
 * {
 *   serverDate: "2025-01-15",  // The date the server considers "today"
 *   element: "heart" | "water" | "lightning" | "darkness" | null,
 *   relicKey: string | null,
 *   intentionOfDay: string | null
 * }
 */
export async function GET() {
  try {
    // Get current date in America/New_York timezone using server time
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    // en-CA format gives us YYYY-MM-DD directly
    const serverDate = formatter.format(now);

    // Create a supabase client for this request
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch today's element using the server-computed date
    const { data, error } = await supabase
      .from('element_of_day')
      .select('day, element, relic_key, intention_of_day')
      .eq('day', serverDate)
      .maybeSingle();

    if (error) {
      console.error('[element-of-day API] Error fetching:', error.message);
      return NextResponse.json(
        { serverDate, element: null, relicKey: null, intentionOfDay: null, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      serverDate,
      element: data?.element ?? null,
      relicKey: data?.relic_key ?? null,
      intentionOfDay: data?.intention_of_day ?? null,
    });
  } catch (err: any) {
    console.error('[element-of-day API] Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
