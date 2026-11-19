import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export async function GET() {
  const { data, error } = await getSupabaseAdmin().from("collaboration_terms").select("version,terms,created_at").eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Collaboration terms are temporarily unavailable." }, { status: 503 });
  return NextResponse.json({ version: data.version, terms: data.terms });
}
