import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validateCollaborationSubmission } from "@/lib/collaborationRules.mjs";
import { sendCollaborationEmails } from "@/lib/collaborationEmails";
import { getCollabInviteSession } from "@/lib/collabAccess";

export const runtime = "nodejs";
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (clean(body.website, 100)) return NextResponse.json({ ok: true }); // honeypot
    const songId = clean(body.songId, 80), submissionKey = clean(body.submissionKey, 80), termsVersion = clean(body.termsVersion, 80);
    const artist = clean(body.artistName, 120), email = clean(body.email, 320).toLowerCase();
    const profile = clean(body.profileLink, 500), phone = clean(body.phone, 40), contribution = clean(body.contributionType, 40), message = clean(body.message, 1200);
    const invite = await getCollabInviteSession();
    if (!invite) return NextResponse.json({ error: "Enter with your approved name or open your active personal invitation before submitting a collaboration request." }, { status: 403 });
    if (!validateCollaborationSubmission({ songId, inviteId: invite.id, submissionKey, termsVersion, artistName: artist, email, contributionType: contribution, acknowledged: body.acknowledged })) {
      return NextResponse.json({ error: "Check the required fields and acknowledgment." }, { status: 400 });
    }
    const db = getSupabaseAdmin();
    const [{ data: song }, { data: terms }] = await Promise.all([
      db.from("songs").select("id,title,slug,collaboration_enabled").eq("id", songId).maybeSingle(),
      db.from("collaboration_terms").select("version").eq("version", termsVersion).eq("active", true).maybeSingle(),
    ]);
    if (!song || song.collaboration_enabled !== true) return NextResponse.json({ error: "This invitation is invalid, expired, or disabled." }, { status: 403 });
    if (!terms) return NextResponse.json({ error: "Collaboration terms are not configured." }, { status: 503 });
    const ip = request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
    const ipHash = createHash("sha256").update(`${process.env.SUPABASE_SERVICE_ROLE_KEY}:${ip}`).digest("hex");
    const rate = await db.rpc("consume_collaboration_rate_limit", { p_ip_hash: ipHash });
    if (rate.error || typeof rate.data !== "boolean") {
      console.error("[collab] rate limit check failed", rate.error);
      return NextResponse.json({ error: "Request service is temporarily unavailable. Please try again." }, { status: 503 });
    }
    if (!rate.data) return NextResponse.json({ error: "Please try again later." }, { status: 429 });
    const submittedAt = new Date().toISOString();
    const { data: row, error } = await db.from("collaboration_requests").insert({
      submission_key: submissionKey, submission_ip_hash: ipHash,
      invite_id: invite.source === "invite" ? invite.id : null,
      authorized_person_id: invite.source === "authorized_person" ? invite.id : null,
      song_id: songId, artist_name: artist, email, profile_link: profile || null, phone: phone || null,
      contribution_type: contribution, message: message || null, terms_version: terms.version,
      acknowledged_at: submittedAt, submitted_at: submittedAt,
    }).select("id").single();
    if (error?.code === "23505") {
      const { data: prior } = await db.from("collaboration_requests").select("id").eq("submission_key", submissionKey).maybeSingle();
      if (prior) return NextResponse.json({ ok: true, id: prior.id, duplicate: true });
    }
    if (error || !row) {
      console.error("[collab] request save failed", error);
      return NextResponse.json({ error: "Your request could not be saved. Please try again." }, { status: 500 });
    }
    await db.from("collaboration_request_events").insert({ request_id: row.id, event: "requested" });
    const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const deliveries = await sendCollaborationEmails({ id: row.id, artist_name: artist, email, profile_link: profile || null, phone: phone || null, contribution_type: contribution, message: message || null, submitted_at: submittedAt, songs: { title: song.title, slug: song.slug } }, base);
    const emailError = [deliveries.admin, deliveries.artist].filter((delivery) => delivery.status === "failed").map((delivery) => delivery.error).filter(Boolean).join("; ") || null;
    const emailUpdate = await db.from("collaboration_requests").update({ email_admin_status: deliveries.admin.status, email_admin_id: deliveries.admin.messageId, email_artist_status: deliveries.artist.status, email_artist_id: deliveries.artist.messageId, email_error: emailError, last_email_attempt_at: new Date().toISOString() }).eq("id", row.id);
    if (emailUpdate.error) console.error("[collab] email status update failed", emailUpdate.error);
    return NextResponse.json({ ok: true, id: row.id, emailStatus: { admin: deliveries.admin.status, artist: deliveries.artist.status } });
  } catch (error) {
    console.error("[collab] submission error", error);
    return NextResponse.json({ error: "Unable to submit the request right now." }, { status: 500 });
  }
}
