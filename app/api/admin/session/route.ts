import { NextResponse } from "next/server";
import { getApiUser, isAdminUser } from "@/lib/apiAuth";

export async function GET() {
  const auth = await getApiUser();
  return NextResponse.json(
    { isAdmin: !!auth && isAdminUser(auth.user) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
