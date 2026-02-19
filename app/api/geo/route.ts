import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const city = req.headers.get("x-vercel-ip-city") ?? "";
  const country = req.headers.get("x-vercel-ip-country") ?? "";

  return NextResponse.json({ city: decodeURIComponent(city), country });
}
