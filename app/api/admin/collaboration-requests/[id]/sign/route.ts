import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createSignedAgreementPdf } from "@/lib/signedAgreementPdf";

export const runtime = "nodejs";
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid agreement." }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: row, error } = await db.from("collaboration_requests").select("id,song_id,email,status,agreement_status,agreement_type,agreement_terms,agreement_version,agreement_approved_version,agreement_access_version,agreement_access_expires_at,admin_signed_at,collaborator_signed_at,collaborator_signed_version,collaborator_signature,collaborator_printed_name,collaborator_signed_snapshot_hash,signed_agreement_path,songs(title)").eq("id", id).maybeSingle();
  if (error) { console.error("[admin/collaboration-sign] lookup failed", { id, code: error.code, message: error.message }); return NextResponse.json({ error: "Unable to look up this agreement. Refresh the request and try again." }, { status: 500 }); }
  if (!row) return NextResponse.json({ error: `Agreement ${id} was not found in collaboration_requests.` }, { status: 404 });
  if (row.agreement_status === "signed") return NextResponse.json({ error: "This agreement is already executed and immutable." }, { status: 409 });
  if (!row.agreement_approved_version || row.agreement_version !== row.agreement_approved_version || row.agreement_access_version !== row.agreement_version || !row.agreement_access_expires_at || Date.parse(row.agreement_access_expires_at) < Date.now()) return NextResponse.json({ error: "Send and approve this exact agreement version before signing." }, { status: 409 });
  if (row.admin_signed_at) return NextResponse.json({ ok: true, alreadySigned: true, executed: row.agreement_status === "signed" }, { status: 200 });
  const signedAt = new Date().toISOString();
  const update = await db.from("collaboration_requests").update({ admin_signed_at: signedAt, admin_signature: "Chandler Pierce · CHXNDLER signature asset", updated_at: signedAt }).eq("id", id).eq("agreement_version", row.agreement_version).eq("agreement_approved_version", row.agreement_version).is("admin_signed_at", null).select("id").maybeSingle();
  if (update.error || !update.data) return NextResponse.json({ error: "The agreement changed before your signature could be recorded." }, { status: 409 });
  await db.from("collaboration_request_events").insert({ request_id: id, event: "admin_signed_online", details: { signer: auth.user.email, version: row.agreement_version, signed_at: signedAt, consent: true } });
  if (!row.collaborator_signed_at || row.collaborator_signed_version !== row.agreement_version) return NextResponse.json({ ok: true, executed: false, adminSignedAt: signedAt });
  const terms = (row.agreement_terms || {}) as Record<string, any>;
  const song = Array.isArray(row.songs) ? row.songs[0]?.title : (row.songs as any)?.title;
  const pdf = await createSignedAgreementPdf({ id, version: row.agreement_version, song: song || terms.song_title || "Collaboration project", type: row.agreement_type, terms, collaboratorSignature: row.collaborator_signature || row.collaborator_printed_name || "", collaboratorSignedAt: row.collaborator_signed_at, adminSignedAt: signedAt, snapshotHash: row.collaborator_signed_snapshot_hash || hash(JSON.stringify({ id, version: row.agreement_version, terms })) });
  const path = `${id}/signed-v${row.agreement_version}.pdf`;
  const uploaded = await db.storage.from("collaboration-agreements").upload(path, pdf, { contentType: "application/pdf", upsert: false });
  if (uploaded.error) return NextResponse.json({ error: "CHXNDLER signature saved, but the final PDF could not be stored. Contact support before retrying." }, { status: 500 });
  const pdfHash = hash(pdf);
  const finalized = await db.from("collaboration_requests").update({ agreement_status: "signed", signed_at: signedAt, signed_agreement_version: row.agreement_version, signed_agreement_path: path, signed_agreement_hash: pdfHash, updated_at: signedAt }).eq("id", id).eq("agreement_version", row.agreement_version).eq("collaborator_signed_version", row.agreement_version).select("id").maybeSingle();
  if (finalized.error || !finalized.data) return NextResponse.json({ error: "PDF created but final status could not be recorded. Contact support before retrying." }, { status: 500 });
  await db.from("collaboration_request_events").insert({ request_id: id, event: "agreement_fully_executed", details: { version: row.agreement_version, signed_at: signedAt, pdf_hash: pdfHash } });
  if (row.email && process.env.SMTP_HOST && process.env.SMTP_FROM && process.env.SMTP_USER && process.env.SMTP_PASS) {
    let transport: import("nodemailer").Transporter | null = null;
    try {
      const nodemailer = await import("nodemailer"), port = Number(process.env.SMTP_PORT || 587);
      transport = nodemailer.default.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
      await transport.sendMail({ from: `CHXNDLER <${process.env.SMTP_FROM}>`, to: row.email, replyTo: process.env.COLLAB_REPLY_TO || process.env.SMTP_FROM, subject: `Signed collaboration agreement · ${song || "Collaboration project"}`, text: `Your CHXNDLER collaboration agreement is fully signed. The executed PDF is attached.`, html: `<div style="font:15px/1.6 Arial,sans-serif;color:#17171c"><p>Your CHXNDLER collaboration agreement is fully signed.</p><p>The executed PDF is attached for your records.</p></div>`, attachments: [{ filename: `CHXNDLER-Collaboration-Agreement-v${row.agreement_version}.pdf`, content: pdf, contentType: "application/pdf" }] });
      await db.from("collaboration_requests").update({ collaborator_signature_email_sent_at: new Date().toISOString() }).eq("id", id).eq("collaborator_signed_version", row.agreement_version);
      await db.from("collaboration_request_events").insert({ request_id: id, event: "signed_agreement_emailed", details: { version: row.agreement_version, to: row.email } });
    } catch (error) { console.error("[collab/admin-sign] signed copy email failed", error); }
    finally { try { transport?.close(); } catch {} }
  }
  return NextResponse.json({ ok: true, executed: true, signedAgreementHash: pdfHash });
}
