import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "node:crypto";

const keys = ["ownership", "royalties", "credits", "release_rights"] as const;
export async function GET() {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const { data, error } = await getSupabaseAdmin().from("collaboration_terms").select("version,terms,active,created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load terms history." }, { status: 500 });
  return NextResponse.json({ versions: data || [] });
}

export async function POST(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json(), terms: Record<string, string> = {};
  for (const key of keys) {
    if (typeof body.terms?.[key] !== "string" || !body.terms[key].trim() || body.terms[key].length > 2000) return NextResponse.json({ error: "All four terms are required (maximum 2,000 characters each)." }, { status: 400 });
    terms[key] = body.terms[key].trim();
  }
  const db = getSupabaseAdmin(), version = `collab-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const { error: insertError } = await db.from("collaboration_terms").insert({ version, terms, active: true });
  if (insertError) return NextResponse.json({ error: "Could not save the new terms version." }, { status: 500 });
  const { error: deactivateError } = await db.from("collaboration_terms").update({ active: false }).neq("version", version);
  if (deactivateError) console.error("[collab] prior terms could not be deactivated", deactivateError);
  return NextResponse.json({ version });
}
