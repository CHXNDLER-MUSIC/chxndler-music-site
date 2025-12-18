import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClientWithJwt } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value || '';
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServerClientWithJwt(token);
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = userResult.user;

  // Try to get profile; if missing, create then re-fetch
  let { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && (error as any).code === 'PGRST116') {
    try {
      const admin = getSupabaseAdmin();
      await admin.from('profiles').upsert(
        { id: user.id, name: null, hearts: 0, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

      const re = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      data = re.data as any;
      error = re.error as any;
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Failed to create profile' }, { status: 500 });
    }
  }

  if (error) {
    const status = (error as any).code === 'PGRST116' ? 404 : 400;
    return NextResponse.json({ error: (error as any).message || 'Error' }, { status });
  }
  return NextResponse.json(data, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value || '';
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServerClientWithJwt(token);
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = userResult.user;

  let body: { name?: string; avatar_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: (error as any).message || 'Update failed' }, { status: 400 });
  }
  return NextResponse.json(data, { status: 200 });
}

