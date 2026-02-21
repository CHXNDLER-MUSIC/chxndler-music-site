import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body?.email as string | undefined;
    const source = (body?.source as string | undefined) ?? 'welcome_home_modal';

    const admin = getSupabaseAdmin();

    // If nothing to record, still return ok to keep UX smooth
    if (!email && !source) {
      if (process.env.NODE_ENV !== "production") console.warn('track-heart-signal called with no email or source');
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Try to detect column names if sessions schema differs
    let emailCol = 'email';
    let sourceCol = 'source';
    try {
      const { data: sampleRows } = await admin
        .from('sessions')
        .select('*')
        .limit(1);
      const sample = sampleRows?.[0] || {};
      const cols = new Set(Object.keys(sample));
      const emailCandidates = ['email', 'recipient_email', 'user_email', 'email_address'];
      const sourceCandidates = ['source', 'origin', 'referrer', 'ref_source'];
      const detectedEmail = emailCandidates.find((c) => cols.has(c));
      const detectedSource = sourceCandidates.find((c) => cols.has(c));
      if (detectedEmail) emailCol = detectedEmail;
      if (detectedSource) sourceCol = detectedSource;
    } catch (schemaProbeError) {
      console.error('Failed to probe sessions schema:', schemaProbeError);
    }

    const insertData: Record<string, any> = {};
    if (email) insertData[emailCol] = email;
    if (source) insertData[sourceCol] = source;

    if (Object.keys(insertData).length > 0) {
      const { error } = await admin.from('sessions').insert(insertData);
      if (error) {
        console.error('Failed to track heart signal in sessions:', error);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    // Always return ok, but log the real error
    console.error('track-heart-signal unexpected error:', error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
