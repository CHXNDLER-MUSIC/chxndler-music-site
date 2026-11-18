import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const db = getSupabaseAdmin(), id = new URL(request.url).searchParams.get("id");
  let query = db.from("collaboration_requests").select("*, songs(title,slug)").order("submitted_at", { ascending: false });
  if (id) query = query.eq("id", id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load requests." }, { status: 500 });
  if (id && data?.[0]) {
    const { data: events } = await db.from("collaboration_request_events").select("*").eq("request_id", id).order("created_at", { ascending: true });
    return NextResponse.json({ request: data[0], events: events || [] });
  }
  return NextResponse.json({ requests: data || [] });
}

export async function PATCH(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json(), id = String(body.id || ""), db = getSupabaseAdmin();
  const allowed = ["new","reviewing","approved","declined","agreement_pending","in_progress","completed","canceled","archived"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.status === "string" && allowed.includes(body.status)) {
    update.status = body.status; update.reviewed_at = ["reviewing","approved","declined"].includes(body.status) ? new Date().toISOString() : undefined;
  }
  if (body.status === "signed") return NextResponse.json({ error: "Verify and record the signed agreement before advancing this request." }, { status: 400 });
  if (typeof body.internal_notes === "string") update.internal_notes = body.internal_notes.slice(0, 10000);
  if (body.agreement && typeof body.agreement === "object") update.agreement_terms = body.agreement;
  if (typeof body.agreement_status === "string" && ["not_started","pending","sent","signed"].includes(body.agreement_status)) {
    if (body.agreement_status === "signed") return NextResponse.json({ error: "Signed agreement storage and signature verification are not configured yet." }, { status: 409 });
    update.agreement_status = body.agreement_status; if (body.agreementPath) update.agreement_path = String(body.agreementPath); if (body.agreement_status === "signed") update.signed_at = new Date().toISOString();
  }
  const { data, error } = await db.from("collaboration_requests").update(update).eq("id", id).select("id,status,agreement_status").single();
  if (error) return NextResponse.json({ error: "Unable to update request." }, { status: 500 });
  if (body.status) await db.from("collaboration_request_events").insert({ request_id: id, event: String(body.status), details: { actor: auth.user.email } });
  return NextResponse.json({ request: data });
}
