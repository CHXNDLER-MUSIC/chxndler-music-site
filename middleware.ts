import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that should bypass auth checks completely
const AUTH_BYPASS_ROUTES = [
  '/auth/callback',
  '/auth/confirm',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth callback routes to pass through without any auth checks
  // This is critical - the callback page needs to receive the ?code= parameter
  // and exchange it for a session before any auth validation can occur
  if (AUTH_BYPASS_ROUTES.some(route => pathname.startsWith(route))) {
    console.log('[MIDDLEWARE] Bypassing auth for:', pathname);
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

  let user = null;
  if (session) {
    // Only call getUser() when we have a session - this validates the token
    // and refreshes cookies if needed
    const { data: userData } = await supabase.auth.getUser();
    user = userData?.user ?? null;
  }
  // If no session, user remains null - this is expected for logged-out users (no error logged)

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
