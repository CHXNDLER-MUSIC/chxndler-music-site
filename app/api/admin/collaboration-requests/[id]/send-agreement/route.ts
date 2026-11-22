import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { agreementTypes, validateAgreement, type AgreementType } from "@/lib/collaborationAgreements";
import { canTransitionCollaborationStatus } from "@/lib/collaborationRules.mjs";

export const runtime = "nodejs";
const BUCKET = "collaboration-agreements";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: row, error } = await db.from("collaboration_requests").select("id,song_id,invite_id,authorized_person_id,artist_name,email,status,agreement_status,agreement_type,agreement_terms,agreement_version,agreement_approved_at,agreement_approved_version,agreement_template_id,agreement_template_version,agreement_path,songs(title)").eq("id", id).maybeSingle();
  if (error || !row) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (row.agreement_status === "signed" || row.status === "signed") return NextResponse.json({ error: "This request already has a signed agreement." }, { status: 409 });
  if (!row.agreement_approved_at || row.agreement_approved_version !== row.agreement_version) return NextResponse.json({ error: "Approve the current agreement version before sending." }, { status: 409 });
  if (!row.agreement_type || !agreementTypes.some(type => type.value === row.agreement_type)) return NextResponse.json({ error: "Choose an agreement type and save the draft first." }, { status: 409 });
  const terms = (row.agreement_terms || {}) as Record<string, any>;
  const missing = validateAgreement(row.agreement_type as AgreementType, terms);
  if (missing.length) return NextResponse.json({ error: `Resolve required agreement terms first: ${missing.join(", ")}.` }, { status: 409 });
  const versionSnapshot = await db.from("collaboration_agreement_versions").select("id,structured_terms").eq("request_id", id).eq("version", row.agreement_version).maybeSingle();
  if (versionSnapshot.error) return NextResponse.json({ error: "Could not verify the immutable agreement version before sending." }, { status: 500 });
  if (!versionSnapshot.data) {
    const inserted = await db.from("collaboration_agreement_versions").insert({
      request_id: id, song_id: row.song_id, invite_id: row.invite_id, authorized_person_id: row.authorized_person_id,
      agreement_type: row.agreement_type, version: row.agreement_version, agreement_status: "approved",
      structured_terms: terms, agreement_template_id: row.agreement_template_id, agreement_template_version: row.agreement_template_version,
      document_path: row.agreement_path, created_by: auth.user.email || null,
    }).select("id,structured_terms").single();
    if (inserted.error) return NextResponse.json({ error: "The approved agreement snapshot could not be recorded, so it was not sent." }, { status: 500 });
  }
  if (!row.email) return NextResponse.json({ error: "This collaborator does not have an email address for delivery." }, { status: 409 });
  if (row.status !== "agreement_pending" && !canTransitionCollaborationStatus(row.status, "agreement_pending")) return NextResponse.json({ error: "Approve the collaboration request before sending an agreement." }, { status: 409 });
  const host = process.env.SMTP_HOST, fromAddress = process.env.SMTP_FROM, replyTo = process.env.COLLAB_REPLY_TO || fromAddress;
  if (!host || !fromAddress || !replyTo || !process.env.SMTP_USER || !process.env.SMTP_PASS) return NextResponse.json({ error: "Agreement email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, and COLLAB_REPLY_TO (or SMTP_FROM)." }, { status: 503 });
  const fileLink = row.agreement_path ? await db.storage.from(BUCKET).createSignedUrl(row.agreement_path, 60 * 60 * 24 * 7) : null;
  if (row.agreement_path && (fileLink?.error || !fileLink?.data?.signedUrl)) return NextResponse.json({ error: "Could not create a secure agreement link." }, { status: 500 });
  const songRelation = Array.isArray(row.songs) ? row.songs[0] : row.songs;
  const title = songRelation?.title || "Collaboration project";
  const role = agreementTypes.find(type => type.value === row.agreement_type)?.label || "Collaboration";
  const accessToken = randomBytes(32).toString("base64url");
  const accessTokenHash = createHash("sha256").update(accessToken).digest("hex");
  const accessExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const base = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
  const reviewUrl = `${base}/collab/agreement/${accessToken}`;
  const tokenUpdate = await db.from("collaboration_requests").update({ agreement_access_token_hash: accessTokenHash, agreement_access_expires_at: accessExpiresAt, agreement_access_version: row.agreement_version }).eq("id", id).eq("agreement_version", row.agreement_version).eq("agreement_approved_version", row.agreement_version).select("id").maybeSingle();
  if (tokenUpdate.error || !tokenUpdate.data) return NextResponse.json({ error: "Could not create a private link for the approved agreement." }, { status: 500 });
  const html = `<div style="background:#09090c;color:#fff;padding:28px;font:15px Arial;line-height:1.6"><h1 style="color:#ff3ea5">CHXNDLER</h1><p>Hi ${escapeHtml(row.artist_name)},</p><p>Your ${escapeHtml(role)} agreement for <b>${escapeHtml(title)}</b> (version ${row.agreement_version}) is ready for review.</p><p><a href="${escapeHtml(reviewUrl)}" style="display:inline-block;padding:12px 18px;background:#ff3ea5;color:#09090c;text-decoration:none;font-weight:bold">Review and sign agreement</a></p><p>This private link expires in 30 days. ${fileLink?.data?.signedUrl ? `<a href="${escapeHtml(fileLink.data.signedUrl)}" style="color:#ff80c4">Download the reviewed PDF</a>` : "You can print or save a PDF from the agreement page."}</p><p>Need help? Reply to this email.</p><p>CHXNDLER</p></div>`;
  let transport: import("nodemailer").Transporter;
  try {
    const nodemailer = await import("nodemailer");
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.default.createTransport({ host, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  } catch {
    await db.from("collaboration_requests").update({ agreement_access_token_hash: null, agreement_access_expires_at: null, agreement_access_version: null }).eq("id", id).eq("agreement_access_token_hash", accessTokenHash);
    return NextResponse.json({ error: "Unable to initialize agreement email." }, { status: 503 });
  }
  let messageId: string;
  try {
    const sent = await transport.sendMail({ from: `CHXNDLER <${fromAddress}>`, to: row.email, replyTo, subject: `Collaboration agreement · ${title}`, text: `Hi ${row.artist_name},\n\nYour ${role} agreement for ${title} (version ${row.agreement_version}) is ready for review and signature.\n\nOpen your private agreement page: ${reviewUrl}\nThis link expires in 30 days.${fileLink?.data?.signedUrl ? `\nDownload the reviewed PDF: ${fileLink.data.signedUrl}` : " You can print or save a PDF from the agreement page."}\n\nNeed help? Reply to this email.\n\nCHXNDLER`, html });
    messageId = sent.messageId || "accepted";
  } catch (sendError) {
    try { transport.close(); } catch {}
    await db.from("collaboration_requests").update({ agreement_access_token_hash: null, agreement_access_expires_at: null, agreement_access_version: null }).eq("id", id).eq("agreement_access_token_hash", accessTokenHash);
    const detail = sendError instanceof Error ? sendError.message.slice(0, 300) : "Mail server rejected the message.";
    return NextResponse.json({ error: `Agreement email failed: ${detail}` }, { status: 502 });
  }
  try { transport.close(); } catch {}
  const version = row.agreement_version || 1;
  const update = await db.from("collaboration_requests").update({ agreement_status: "awaiting_signature", agreement_sent_at: new Date().toISOString(), status: "agreement_pending", updated_at: new Date().toISOString() }).eq("id", id).eq("agreement_version", version).eq("agreement_approved_version", version).eq("agreement_access_token_hash", accessTokenHash).select("id").maybeSingle();
  if (update.error || !update.data) return NextResponse.json({ error: `Email ${messageId} was accepted, but the request status could not be saved for version ${version}. Review the request before retrying.` }, { status: 500 });
  await db.from("collaboration_request_events").insert({ request_id: id, event: "agreement_awaiting_signature", details: { actor: auth.user.email, messageId, version } });
  return NextResponse.json({ ok: true, messageId, agreement_status: "awaiting_signature", version, reviewUrl });
}
