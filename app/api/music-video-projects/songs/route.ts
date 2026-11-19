import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
export async function GET() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const { data, error } = await getSupabaseAdmin().from("songs").select("id,title,slug,collaboration_enabled").not("slug", "is", null).order("title");
  if (error) return NextResponse.json({ error: "Unable to load songs." }, { status: 500 });
  return NextResponse.json({ songs: data || [] });
}
