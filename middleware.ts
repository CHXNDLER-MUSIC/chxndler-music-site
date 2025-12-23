import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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

  // IMPORTANT: Do NOT use getSession() here - it doesn't validate the token.
  // Use getUser() to ensure the session is valid and refresh tokens if needed.
  // This will also set any refreshed cookies on the response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Debug logging for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const allCookies = request.cookies.getAll();
    const cookieNames = allCookies.map(c => c.name);
    const sbCookies = cookieNames.filter(n => n.startsWith('sb-'));

    console.log('[MIDDLEWARE] ============================================');
    console.log('[MIDDLEWARE] Path:', request.nextUrl.pathname);
    console.log('[MIDDLEWARE] All cookie names:', cookieNames);
    console.log('[MIDDLEWARE] sb-* cookies:', sbCookies);
    console.log('[MIDDLEWARE] supabase.auth.getUser() result:', {
      hasUser: !!user,
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
    });
    console.log('[MIDDLEWARE] ============================================');
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
