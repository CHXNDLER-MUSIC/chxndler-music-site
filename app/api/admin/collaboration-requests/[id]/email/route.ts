import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendCollaborationEmails, type EmailRecipient } from "@/lib/collaborationEmails";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const db = getSupabaseAdmin();
  const { data: row, error } = await db.from("collaboration_requests").select("*, songs(title,slug)").eq("id", id).maybeSingle();
  if (error || !row) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const requested = body.recipient === "admin" || body.recipient === "artist" ? [body.recipient] as EmailRecipient[] : ["admin", "artist"] as EmailRecipient[];
  const retryable = requested.filter((recipient) => row[recipient === "admin" ? "email_admin_status" : "email_artist_status"] !== "sent");
  if (!retryable.length) return NextResponse.json({ error: "These notifications have already been accepted by the mail server." }, { status: 409 });
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const deliveries = await sendCollaborationEmails(row, base, retryable);
  const update: Record<string, unknown> = { last_email_attempt_at: new Date().toISOString() };
  for (const recipient of retryable) {
    update[recipient === "admin" ? "email_admin_status" : "email_artist_status"] = deliveries[recipient].status;
    update[recipient === "admin" ? "email_admin_id" : "email_artist_id"] = deliveries[recipient].messageId;
  }
  const errors = retryable.map((recipient) => deliveries[recipient].error).filter(Boolean);
  update.email_error = errors.join("; ") || null;
  const saved = await db.from("collaboration_requests").update(update).eq("id", id);
  if (saved.error) return NextResponse.json({ error: "Delivery was attempted, but its result could not be saved. Check server logs before retrying." }, { status: 500 });
  await db.from("collaboration_request_events").insert({ request_id: id, event: "email_retry", details: { actor: auth.user.email, recipients: retryable, results: deliveries } });
  return NextResponse.json({ deliveries });
}
