import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV !== "production") console.log('[ping] route hit');
  return NextResponse.json({ pong: true });
}
