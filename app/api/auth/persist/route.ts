import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Safari (and every iOS browser) caps cookies written via document.cookie at
// 7 days. The Supabase browser client stores the session that way, so a fan
// who didn't come back within a week would be asked for a new 6-digit code.
// The client calls this route right after it writes a session (sign-in, token
// refresh, page load); echoing the same cookies back as HTTP Set-Cookie headers
// makes them server-set, which lifts the cap.
//
// Safety: it never issues new credentials or accepts any from the body — it
// only re-sends cookies the browser already sent, and only after Supabase
// confirms the session is still valid.

const SUPABASE_AUTH_COOKIE = /^sb-[a-z0-9]+-auth-token(\.\d+)?$/;
const MAX_AGE = 400 * 24 * 60 * 60; // browser maximum; matches @supabase/ssr default
// A token this close to expiry is about to be rotated by the client. Skip it so
// a slow response can't put an already-rotated refresh token back in the jar;
// the refresh that follows will call this route again.
const NEAR_EXPIRY_SECONDS = 120;

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // Cookie changes Supabase itself makes while checking (e.g. clearing a
  // revoked session) are passed through unchanged.
  const supabaseCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseCookies.push(...cookiesToSet);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  const secondsLeft = (session?.expires_at ?? 0) - Math.floor(Date.now() / 1000);
  const persist = !!user && !!session && secondsLeft >= NEAR_EXPIRY_SECONDS;

  const res = NextResponse.json({ ok: true, persisted: persist });
  res.headers.set('Cache-Control', 'no-store');
  supabaseCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));

  if (persist) {
    for (const { name, value } of request.cookies.getAll()) {
      if (!value || !SUPABASE_AUTH_COOKIE.test(name)) continue;
      res.cookies.set(name, value, {
        path: '/',
        maxAge: MAX_AGE,
        sameSite: 'lax',
        httpOnly: false, // the browser client must still be able to read it
        secure: request.nextUrl.protocol === 'https:',
      });
    }
  }

  return res;
}
