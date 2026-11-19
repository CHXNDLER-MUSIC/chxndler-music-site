import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function gate() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  return null;
}

export async function GET(request: Request) {
  const denied = await gate(); if (denied) return denied;
  const id = new URL(request.url).searchParams.get("opportunity");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Choose an opportunity." }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("outreach_communications").select("id,channel,occurred_at,summary").eq("outreach_record_id", id).order("occurred_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load communication history. Apply the outreach workspace migration first." }, { status: 503 });
  return NextResponse.json({ communications: data || [] });
}

export async function POST(request: Request) {
  const denied = await gate(); if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid communication entry." }, { status: 400 }); }
  const id = typeof body.opportunityId === "string" ? body.opportunityId : "";
  const channel = typeof body.channel === "string" ? body.channel : "";
  const summary = typeof body.summary === "string" ? body.summary.trim().slice(0, 4000) : "";
  const occurredAt = typeof body.occurredAt === "string" ? new Date(body.occurredAt) : new Date();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["email", "dm", "call", "meeting", "note"].includes(channel) || Number.isNaN(occurredAt.getTime())) return NextResponse.json({ error: "Choose a valid channel and date." }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: record, error: recordError } = await db.from("outreach_records").select("contact_id,status").eq("id", id).maybeSingle();
  if (recordError || !record) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  const { data, error } = await db.from("outreach_communications").insert({ outreach_record_id: id, channel, occurred_at: occurredAt.toISOString(), summary }).select("id,channel,occurred_at,summary").single();
  if (error) return NextResponse.json({ error: "Unable to save communication history." }, { status: 500 });
  if (channel !== "note") {
    const patch: Record<string, unknown> = { sent_at: occurredAt.toISOString().slice(0, 10), updated_at: new Date().toISOString() };
    if (!record.status || record.status === "Planned" || record.status === "Sent" || record.status === "Follow-up") patch.status = "Contacted";
    await db.from("outreach_records").update(patch).eq("id", id);
    if (record.contact_id) {
      await db.from("marketing_contacts").update({ last_contacted_at: occurredAt.toISOString(), connection_status: "connected", updated_at: new Date().toISOString() }).eq("id", record.contact_id).eq("connection_status", "not_contacted");
    }
  }
  return NextResponse.json({ communication: data }, { status: 201 });
}
