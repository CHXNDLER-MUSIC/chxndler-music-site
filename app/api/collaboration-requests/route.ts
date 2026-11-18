import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validateCollaborationSubmission } from "@/lib/collaborationRules.mjs";

export const runtime = "nodejs";
const LIMIT = 4;
const WINDOW_MS = 60 * 60 * 1000;
const attempts = new Map<string, number[]>();
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= LIMIT) return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  recent.push(now); attempts.set(ip, recent);
  try {
    const body = await request.json();
    if (clean(body.website, 100)) return NextResponse.json({ ok: true }); // honeypot
    const songId = clean(body.songId, 80), token = clean(body.inviteToken, 256), submissionKey = clean(body.submissionKey, 80);
    const artist = clean(body.artistName, 120), email = clean(body.email, 320).toLowerCase();
    const profile = clean(body.profileLink, 500), phone = clean(body.phone, 40), contribution = clean(body.contributionType, 40), message = clean(body.message, 1200);
    if (!validateCollaborationSubmission({ songId, inviteToken: token, submissionKey, artistName: artist, email, contributionType: contribution, acknowledged: body.acknowledged })) {
      return NextResponse.json({ error: "Check the required fields and acknowledgment." }, { status: 400 });
    }
    const db = getSupabaseAdmin();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [{ data: invite }, { data: song }, { data: terms }] = await Promise.all([
      db.from("collaboration_invites").select("id").eq("song_id", songId).eq("token_hash", tokenHash).is("revoked_at", null).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).maybeSingle(),
      db.from("songs").select("id,title,slug,collaboration_enabled").eq("id", songId).maybeSingle(),
      db.from("collaboration_terms").select("version").eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (!invite || !song || song.collaboration_enabled !== true) return NextResponse.json({ error: "This invitation is invalid, expired, or disabled." }, { status: 403 });
    if (!terms) return NextResponse.json({ error: "Collaboration terms are not configured." }, { status: 503 });
    const submittedAt = new Date().toISOString();
    const { data: row, error } = await db.from("collaboration_requests").insert({
      submission_key: submissionKey, song_id: songId, artist_name: artist, email, profile_link: profile || null, phone: phone || null,
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
    const detailUrl = `${base}/admin/collaborations/${row.id}`;
    const artwork = `${base}/covers/${encodeURIComponent(song.title)}.webp`;
    let adminStatus = "failed", artistStatus = "failed", adminId: string | null = null, artistId: string | null = null;
    try {
      if (!process.env.SMTP_HOST || !process.env.SMTP_FROM || !process.env.COLLAB_NOTIFICATION_EMAIL) throw new Error("Collaboration SMTP/from/notification configuration is missing");
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.default.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT || 587) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
      const from = `CHXNDLER <${process.env.SMTP_FROM}>`;
      const admin = await transport.sendMail({ from, to: process.env.COLLAB_NOTIFICATION_EMAIL, replyTo: process.env.SMTP_FROM, subject: `New Collab Request: ${song.title} — ${artist}`, html: `<div style="background:#09090c;color:#fff;padding:28px;font:15px Arial"><img src="${escapeHtml(artwork)}" width="120" alt="${escapeHtml(song.title)}"><h1 style="color:#ff3ea5">New Collab Request</h1><p><b>${escapeHtml(song.title)}</b> — ${escapeHtml(artist)}</p><p>${escapeHtml(email)}${profile ? ` · ${escapeHtml(profile)}` : ""}${phone ? ` · ${escapeHtml(phone)}` : ""}</p><p>${escapeHtml(contribution)}</p><p>${escapeHtml(message || "No message provided")}</p><p>${escapeHtml(submittedAt)}</p><a style="display:inline-block;padding:12px 18px;background:#ff3ea5;color:#09090c;text-decoration:none;font-weight:bold" href="${escapeHtml(detailUrl)}">View Request →</a></div>` });
      adminStatus = "sent"; adminId = admin.messageId || null;
      const artistMail = await transport.sendMail({ from, to: email, replyTo: process.env.SMTP_FROM, subject: "Your Collab Request — CHXNDLER", text: `Hey ${artist},\n\nThanks for your interest in collaborating on ${song.title}!\n\nI've received your request and will take a look. If it's a good fit, I'll reach out with next steps.\n\nTalk soon,\nCHXNDLER`, html: `<div style="background:#09090c;color:#fff;padding:28px;font:15px Arial"><h1 style="color:#ff3ea5">CHXNDLER</h1><p>Hey ${escapeHtml(artist)},</p><p>Thanks for your interest in collaborating on ${escapeHtml(song.title)}!</p><p>I've received your request and will take a look. If it's a good fit, I'll reach out with next steps.</p><p>Talk soon,<br>CHXNDLER</p></div>` });
      artistStatus = "sent"; artistId = artistMail.messageId || null;
    } catch (mailError) { console.error("[collab] email send failed", mailError); }
    await db.from("collaboration_requests").update({ email_admin_status: adminStatus, email_admin_id: adminId, email_artist_status: artistStatus, email_artist_id: artistId, email_error: adminStatus === "sent" && artistStatus === "sent" ? null : "One or more notification emails failed; retry from admin." }).eq("id", row.id);
    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    console.error("[collab] submission error", error);
    return NextResponse.json({ error: "Unable to submit the request right now." }, { status: 500 });
  }
}
