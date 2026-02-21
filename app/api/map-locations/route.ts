import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('country')
      .not('country', 'is', null);

    if (error) {
      console.error('map-locations query error:', error);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    // Aggregate by country
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const code = row.country as string;
      if (code) {
        counts[code] = (counts[code] || 0) + 1;
      }
    }

    const locations = Object.entries(counts).map(([country, count]) => ({
      country,
      count,
    }));

    return NextResponse.json({ locations });
  } catch (err: any) {
    console.error('map-locations error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
