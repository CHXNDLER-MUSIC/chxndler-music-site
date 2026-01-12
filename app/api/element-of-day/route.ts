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
      .select('day, element, relic_key, intention_of_day, song_id')
      .eq('day', serverDate)
      .maybeSingle();

    if (error) {
      console.error('[element-of-day API] Error fetching:', error.message);
      return NextResponse.json(
        { serverDate, element: null, relicKey: null, intentionOfDay: null, relicLabel: null, relicImageUrl: null, error: error.message },
        { status: 500 }
      );
    }

    // If we have a relic_key, fetch the relic details
    let relicLabel: string | null = null;
    let relicImageUrl: string | null = null;
    let relicKind: string | null = null;

    if (data?.relic_key) {
      const { data: relicData, error: relicError } = await supabase
        .from('relics')
        .select('label, image_url, kind')
        .eq('code', data.relic_key)
        .maybeSingle();

      if (!relicError && relicData) {
        relicLabel = relicData.label;
        relicImageUrl = relicData.image_url;
        relicKind = relicData.kind;
      }
    }

    // Get song of the day - find a released song matching today's element
    let songOfDayTitle: string | null = null;
    let songOfDaySlug: string | null = null;
    if (data?.element) {
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('title, slug')
        .eq('element', data.element.toUpperCase())
        .eq('is_released', true)
        .limit(1)
        .maybeSingle();

      if (!songError && songData) {
        songOfDayTitle = songData.title;
        songOfDaySlug = songData.slug;
      }
    }

    return NextResponse.json({
      serverDate,
      element: data?.element ?? null,
      relicKey: data?.relic_key ?? null,
      intentionOfDay: data?.intention_of_day ?? null,
      relicLabel,
      relicImageUrl,
      relicKind,
      songOfDayTitle,
      songOfDaySlug,
      songOfDayId: data?.song_id ?? null, // Canonical song_id from element_of_day table
    });
  } catch (err: any) {
    console.error('[element-of-day API] Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
