import { NextResponse } from 'next/server';

export async function GET() {
  // Fresh random number on each request
  const value = Math.random();
  return NextResponse.json({ ok: true, value });
}

