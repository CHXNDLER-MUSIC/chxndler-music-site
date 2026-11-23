import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json({ error: "Agreement link unavailable." }, { status: 404, headers });
  const body = await request.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const db = getSupabaseAdmin();
  const tokenHash = hash(token);
  const { data: row } = await db.from("collaboration_requests").select("id,agreement_status,agreement_version,agreement_approved_version,agreement_access_version,agreement_access_expires_at,collaborator_signed_at").eq("agreement_access_token_hash", tokenHash).maybeSingle();
  if (!row || row.agreement_status !== "awaiting_signature" || row.agreement_version !== row.agreement_approved_version || row.agreement_access_version !== row.agreement_version || !row.agreement_access_expires_at || Date.parse(row.agreement_access_expires_at) < Date.now() || row.collaborator_signed_at) return NextResponse.json({ error: "This agreement is no longer available for changes." }, { status: 409, headers });
  const now = new Date().toISOString();
  const update = await db.from("collaboration_requests").update({ agreement_status: "negotiating", agreement_access_token_hash: null, agreement_access_expires_at: null, agreement_access_version: null, agreement_verified_session_hash: null, agreement_verified_session_expires_at: null, updated_at: now }).eq("id", row.id).eq("agreement_access_token_hash", tokenHash).eq("agreement_status", "awaiting_signature").select("id").maybeSingle();
  if (update.error || !update.data) return NextResponse.json({ error: "Could not submit the change request. Please contact CHXNDLER." }, { status: 500, headers });
  await db.from("collaboration_request_events").insert({ request_id: row.id, event: "agreement_changes_requested", details: { version: row.agreement_version, note, requested_at: now } });
  return NextResponse.json({ ok: true }, { headers });
}
