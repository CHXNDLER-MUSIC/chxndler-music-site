import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClientWithJwt, getSupabaseAdmin } from '../../lib/supabaseServer';

type ErrorBody = { error: string };

function getAccessToken(req: NextApiRequest): string | null {
  // Prefer Authorization: Bearer <token>
  const auth = req.headers['authorization'];
  if (auth && typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  // Fallback: try cookie `sb-access-token`
  const cookieHeader = req.headers['cookie'] || '';
  const match = cookieHeader.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorBody>
) {
  res.setHeader('Allow', 'GET, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const token = getAccessToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization token' });
  }

  const supabase = createSupabaseServerClientWithJwt(token);
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult?.user) {
    return res.status(401).json({ error: 'Unable to resolve authenticated user' });
  }
  const userId = userResult.user.id;

  if (req.method === 'GET') {
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // If not found, create a default profile then re-fetch
    if (error && error.code === 'PGRST116') {
      try {
        const fullName = (userResult.user.user_metadata?.full_name as string | undefined)
          || (userResult.user.user_metadata?.name as string | undefined);
        const email: string | undefined = userResult.user.email || undefined;
        const emailPrefix = email ? email.split('@')[0] : undefined;
        const displayName = fullName || emailPrefix || 'Wanderer';
        const avatarUrl = (userResult.user.user_metadata?.avatar_url as string | undefined) || null;

        const admin = getSupabaseAdmin();
        await admin.from('profiles').upsert({
          id: userId,
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        // Re-fetch as the user
        const re = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        data = re.data as any;
        error = re.error as any;
      } catch (e: any) {
        return res.status(500).json({ error: e?.message || 'Failed to create profile' });
      }
    }

    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 400;
      return res.status(status).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'PATCH') {
    const { display_name, avatar_url } = (req.body ?? {}) as {
      display_name?: unknown;
      avatar_url?: unknown;
    };

    const update: Record<string, any> = {};
    if (typeof display_name === 'string') update.display_name = display_name;
    if (typeof avatar_url === 'string') update.avatar_url = avatar_url;
    update.updated_at = new Date().toISOString();

    if (Object.keys(update).length === 1) {
      // Only updated_at present => nothing to update
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Use upsert to ensure row exists (admin bypasses RLS for insert)
    const admin = getSupabaseAdmin();
    const { error: upsertError } = await admin
      .from('profiles')
      .upsert({ id: userId, ...update }, { onConflict: 'id' });

    if (upsertError) {
      return res.status(400).json({ error: upsertError.message });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 400;
      return res.status(status).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
