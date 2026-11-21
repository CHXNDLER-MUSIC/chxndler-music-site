import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { agreementTypes } from "@/lib/collaborationAgreements";
import { canTransitionCollaborationStatus } from "@/lib/collaborationRules.mjs";

export const runtime = "nodejs";
const BUCKET = "collaboration-agreements";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: row, error } = await db.from("collaboration_requests").select("id,song_id,invite_id,authorized_person_id,artist_name,email,status,agreement_status,agreement_type,agreement_terms,agreement_version,agreement_approved_at,agreement_path,songs(title)").eq("id", id).maybeSingle();
  if (error || !row) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (row.agreement_status === "signed" || row.status === "signed") return NextResponse.json({ error: "This request already has a signed agreement." }, { status: 409 });
  if (!row.agreement_approved_at) return NextResponse.json({ error: "Approve the current agreement terms before sending." }, { status: 409 });
  if (!row.agreement_path) return NextResponse.json({ error: "Upload the reviewed agreement PDF before sending." }, { status: 409 });
  if (!row.agreement_type || !agreementTypes.some(type => type.value === row.agreement_type)) return NextResponse.json({ error: "Choose an agreement type and save the draft first." }, { status: 409 });
  if (row.status !== "agreement_pending" && !canTransitionCollaborationStatus(row.status, "agreement_pending")) return NextResponse.json({ error: "Approve the collaboration request before sending an agreement." }, { status: 409 });
  const host = process.env.SMTP_HOST, fromAddress = process.env.SMTP_FROM, replyTo = process.env.COLLAB_REPLY_TO || fromAddress;
  if (!host || !fromAddress || !replyTo || !process.env.SMTP_USER || !process.env.SMTP_PASS) return NextResponse.json({ error: "Agreement email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, and COLLAB_REPLY_TO (or SMTP_FROM)." }, { status: 503 });
  const { data: fileLink, error: linkError } = await db.storage.from(BUCKET).createSignedUrl(row.agreement_path, 60 * 60 * 24 * 7);
  if (linkError || !fileLink?.signedUrl) return NextResponse.json({ error: "Could not create a secure agreement link." }, { status: 500 });
  const songRelation = Array.isArray(row.songs) ? row.songs[0] : row.songs;
  const title = songRelation?.title || "Collaboration project";
  const role = agreementTypes.find(type => type.value === row.agreement_type)?.label || "Collaboration";
  const html = `<div style="background:#09090c;color:#fff;padding:28px;font:15px Arial;line-height:1.6"><h1 style="color:#ff3ea5">CHXNDLER</h1><p>Hi ${escapeHtml(row.artist_name)},</p><p>Your ${escapeHtml(role)} agreement for <b>${escapeHtml(title)}</b> is ready for review.</p><p><a href="${escapeHtml(fileLink.signedUrl)}" style="display:inline-block;padding:12px 18px;background:#ff3ea5;color:#09090c;text-decoration:none;font-weight:bold">Review agreement PDF</a></p><p>This link expires in seven days. Please sign the reviewed document outside this website and reply with the fully executed PDF. This email does not create an electronic signature.</p><p>CHXNDLER</p></div>`;
  let transport: import("nodemailer").Transporter;
  try {
    const nodemailer = await import("nodemailer");
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.default.createTransport({ host, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  } catch { return NextResponse.json({ error: "Unable to initialize agreement email." }, { status: 503 }); }
  let messageId: string;
  try {
    const sent = await transport.sendMail({ from: `CHXNDLER <${fromAddress}>`, to: row.email, replyTo, subject: `Collaboration agreement · ${title}`, text: `Hi ${row.artist_name},\n\nYour ${role} agreement for ${title} is ready for review: ${fileLink.signedUrl}\n\nThe secure link expires in seven days. Please sign the reviewed document outside this website and reply with the fully executed PDF. This email does not create an electronic signature.\n\nCHXNDLER`, html });
    messageId = sent.messageId || "accepted";
  } catch (sendError) {
    try { transport.close(); } catch {}
    const detail = sendError instanceof Error ? sendError.message.slice(0, 300) : "Mail server rejected the message.";
    return NextResponse.json({ error: `Agreement email failed: ${detail}` }, { status: 502 });
  }
  try { transport.close(); } catch {}
  const version = (row.agreement_version || 0) + 1;
  const update = await db.from("collaboration_requests").update({ agreement_status: "awaiting_signature", agreement_sent_at: new Date().toISOString(), agreement_version: version, status: "agreement_pending", updated_at: new Date().toISOString() }).eq("id", id);
  if (update.error) return NextResponse.json({ error: `Email ${messageId} was accepted, but the request status could not be saved. Review the request before retrying.` }, { status: 500 });
  const snapshot = await db.from("collaboration_agreement_versions").insert({ request_id: id, song_id: row.song_id, invite_id: row.invite_id, authorized_person_id: row.authorized_person_id, agreement_type: row.agreement_type, version, agreement_status: "awaiting_signature", structured_terms: row.agreement_terms || {}, document_path: row.agreement_path, created_by: auth.user.email || null });
  if (snapshot.error) return NextResponse.json({ error: `Email ${messageId} was accepted and the status was saved, but version history could not be saved.` }, { status: 500 });
  await db.from("collaboration_request_events").insert({ request_id: id, event: "agreement_awaiting_signature", details: { actor: auth.user.email, messageId, version } });
  return NextResponse.json({ ok: true, messageId, agreement_status: "awaiting_signature", version });
}
