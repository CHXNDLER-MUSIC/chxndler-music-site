import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[ping] route hit');
  return NextResponse.json({ pong: true });
}
