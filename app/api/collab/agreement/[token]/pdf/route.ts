import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return new Response("Agreement unavailable", { status: 404 });
  const db = getSupabaseAdmin(), tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: row } = await db.from("collaboration_requests").select("id,agreement_status,agreement_access_expires_at,agreement_access_version,agreement_approved_version,signed_agreement_path,signed_agreement_hash").eq("agreement_access_token_hash", tokenHash).maybeSingle();
  if (!row || row.agreement_status !== "signed" || !row.signed_agreement_path || row.agreement_access_version !== row.agreement_approved_version) return new Response("Signed agreement unavailable", { status: 404, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  const { data, error } = await db.storage.from("collaboration-agreements").createSignedUrl(row.signed_agreement_path, 60);
  if (error || !data?.signedUrl) return new Response("Signed agreement unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
  await db.from("collaboration_request_events").insert({ request_id: row.id, event: "signed_agreement_downloaded", details: { version: row.agreement_access_version } });
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } });
}
