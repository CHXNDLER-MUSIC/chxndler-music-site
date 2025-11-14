import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL('/', req.url));
  // Clear auth cookies
  res.cookies.set('sb-access-token', '', { path: '/', maxAge: 0 });
  res.cookies.set('sb-refresh-token', '', { path: '/', maxAge: 0 });
  return res;
}

