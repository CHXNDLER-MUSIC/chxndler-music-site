import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that should bypass auth checks completely
const AUTH_BYPASS_ROUTES = [
  '/auth/callback',
  '/auth/confirm',
];

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // CRITICAL: Catch bad redirects where magic link lands on root with ?code=
  // This happens when Supabase dashboard redirect URL strips the path
  // Redirect to /auth/callback preserving all query params
  if (pathname === '/' && searchParams.has('code')) {
    const callbackUrl = new URL('/auth/callback', request.url);
    // Preserve all query params (code, next, profileSetup, etc.)
    searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });
    if (process.env.NODE_ENV !== "production") console.log('[MIDDLEWARE] Caught bad redirect, forwarding to /auth/callback');
    return NextResponse.redirect(callbackUrl);
  }

  // Allow auth callback routes to pass through without any auth checks
  // This is critical - the callback page needs to receive the ?code= parameter
  // and exchange it for a session before any auth validation can occur
  if (AUTH_BYPASS_ROUTES.some(route => pathname.startsWith(route))) {
    if (process.env.NODE_ENV !== "production") console.log('[MIDDLEWARE] Bypassing auth for:', pathname);
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // First check if there's a session at all (fast, no network call for logged-out users)
  // Then validate with getUser() only if session exists (to refresh tokens if needed)
  const { data: { session } } = await supabase.auth.getSession();

  let user: User | null = null;
  let userCheckFailedTransiently = false;
  if (session) {
    // Only call getUser() when we have a session - this validates the token
    // and refreshes cookies if needed
    const { data: userData, error: userError } = await supabase.auth.getUser();
    user = userData?.user ?? null;
    // Network blips / Supabase 5xx aren't proof the session is bad
    userCheckFailedTransiently = !user && !!userError && !(userError.status && userError.status < 500);
  }
  // If no session, user remains null - this is expected for logged-out users (no error logged)

  // Many API routes authenticate via the legacy `sb-access-token` cookie, which
  // the browser only re-writes after AuthProvider boots. On a returning visit
  // that cookie has long expired (1h), so the first API calls would 401 even
  // though the Supabase session is valid. Mirror the validated (and, if needed,
  // just-refreshed) access token into it here, for this request and the browser.
  // If Supabase couldn't be reached, leave the cookie as-is rather than
  // logging the fan out of API routes over a transient error.
  const legacyToken = request.cookies.get('sb-access-token')?.value;
  const accessToken = user && session ? session.access_token : null;
  if (!userCheckFailedTransiently && accessToken !== (legacyToken ?? null)) {
    const pendingCookies = supabaseResponse.cookies.getAll();
    if (accessToken) {
      request.cookies.set('sb-access-token', accessToken);
    } else {
      request.cookies.delete('sb-access-token');
    }
    supabaseResponse = NextResponse.next({ request });
    pendingCookies.forEach((cookie) => supabaseResponse.cookies.set(cookie));
    if (accessToken) {
      const maxAge = session?.expires_at
        ? Math.max(session.expires_at - Math.floor(Date.now() / 1000), 60)
        : 3600;
      supabaseResponse.cookies.set('sb-access-token', accessToken, {
        path: '/',
        maxAge,
        sameSite: 'lax',
        secure: request.nextUrl.protocol === 'https:',
      });
    } else {
      supabaseResponse.cookies.set('sb-access-token', '', { path: '/', maxAge: 0 });
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4|wav|ico)$).*)',
  ],
};
