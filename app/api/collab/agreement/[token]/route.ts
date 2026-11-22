import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { agreementHtml, agreementTypes, type AgreementType } from "@/lib/collaborationAgreements";
import { canTransitionCollaborationStatus } from "@/lib/collaborationRules.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
type Context = { params: Promise<{ token: string }> };

async function findAgreement(token: string) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const db = getSupabaseAdmin();
  const { data } = await db.from("collaboration_requests")
    .select("id,song_id,invite_id,authorized_person_id,artist_name,email,status,agreement_status,agreement_type,agreement_terms,agreement_version,agreement_approved_version,agreement_access_expires_at,agreement_access_version,agreement_path,collaborator_first_name,collaborator_last_name,collaborator_printed_name,collaborator_signature,collaborator_signed_at,collaborator_signed_version,collaborator_signature_email_sent_at,songs(title)")
    .eq("agreement_access_token_hash", hash).maybeSingle();
  if (!data || !data.agreement_access_expires_at || new Date(data.agreement_access_expires_at).getTime() <= Date.now() || data.agreement_access_version !== data.agreement_approved_version) return null;
  const { data: snapshot } = await db.from("collaboration_agreement_versions").select("structured_terms,agreement_type,version")
    .eq("request_id", data.id).eq("version", data.agreement_access_version).maybeSingle();
  const agreementType = snapshot?.agreement_type || data.agreement_type;
  if (!agreementType || !agreementTypes.some(item => item.value === agreementType)) return null;
  const terms = (snapshot?.structured_terms || data.agreement_terms || {}) as Record<string, any>;
  if (snapshot?.version !== undefined && snapshot.version !== data.agreement_access_version) return null;
  const isSigned = data.agreement_status === "signed" && data.collaborator_signed_version === data.agreement_access_version;
  return { db, row: data, agreementType: agreementType as AgreementType, terms, isSigned };
}

export async function POST(request: Request, { params }: Context) {
  const { token } = await params;
  try {
    const body = await request.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const printedName = String(body.printedName || "").trim();
    const signature = String(body.signature || "").trim();
    if (!body.consent || !firstName || !lastName || !printedName || signature !== printedName || firstName.length > 80 || lastName.length > 80 || printedName.length > 160) {
      return NextResponse.json({ error: "Enter your first and last name, print your name, generate your signature, and confirm your agreement." }, { status: 400, headers: privateHeaders });
    }
    const found = await findAgreement(token);
    if (!found) return NextResponse.json({ error: "This agreement link is invalid or has expired. Ask for a new link." }, { status: 404, headers: privateHeaders });
    const { db, row, terms } = found;
    if (found.isSigned) return NextResponse.json({ ok: true, alreadySigned: true, emailSent: !!row.collaborator_signature_email_sent_at }, { headers: privateHeaders });
    if (row.agreement_status !== "awaiting_signature" || row.status !== "agreement_pending" || row.agreement_approved_version !== row.agreement_version || row.agreement_access_version !== row.agreement_version) {
      return NextResponse.json({ error: "This agreement is no longer available for signature." }, { status: 409, headers: privateHeaders });
    }
    if (!canTransitionCollaborationStatus(row.status, "signed")) return NextResponse.json({ error: "This agreement cannot be signed in its current state." }, { status: 409, headers: privateHeaders });
    const signedAt = new Date().toISOString();
    const update = await db.from("collaboration_requests").update({
      status: "signed", agreement_status: "signed", signed_at: signedAt, signed_agreement_version: row.agreement_access_version,
      collaborator_first_name: firstName, collaborator_last_name: lastName, collaborator_printed_name: printedName,
      collaborator_signature: signature, collaborator_signed_at: signedAt, collaborator_signed_version: row.agreement_access_version,
      updated_at: signedAt,
    }).eq("id", row.id).eq("agreement_access_token_hash", createHash("sha256").update(token).digest("hex"))
      .eq("agreement_version", row.agreement_access_version).eq("agreement_approved_version", row.agreement_access_version)
      .eq("agreement_status", "awaiting_signature").select("id").maybeSingle();
    if (update.error || !update.data) return NextResponse.json({ error: "The agreement changed before your signature could be recorded. Please contact CHXNDLER for a fresh link." }, { status: 409, headers: privateHeaders });

    await db.from("collaboration_request_events").insert({ request_id: row.id, event: "collaborator_signed_online", details: { signer: printedName, version: row.agreement_access_version, signed_at: signedAt } });
    const signedTerms = { ...terms, collaborator_first_name: firstName, collaborator_last_name: lastName, collaborator_printed_name: printedName, collaborator_signature: signature, collaborator_signed_at: signedAt };
    const assetBase = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
    const contract = agreementHtml(found.agreementType, signedTerms).replace('src="/elements/PINK%20SIGNATURE.png"', `src="${assetBase}/elements/PINK%20SIGNATURE.png"`);
    let emailSent = false;
    const fromAddress = process.env.SMTP_FROM;
    const replyTo = process.env.COLLAB_REPLY_TO || fromAddress;
    if (row.email && process.env.SMTP_HOST && fromAddress && replyTo && process.env.SMTP_USER && process.env.SMTP_PASS) {
      let transport: import("nodemailer").Transporter | null = null;
      try {
        const nodemailer = await import("nodemailer");
        const port = Number(process.env.SMTP_PORT || 587);
        transport = nodemailer.default.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
        const title = Array.isArray(row.songs) ? row.songs[0]?.title : row.songs?.title;
        await transport.sendMail({
          from: `CHXNDLER <${fromAddress}>`, to: row.email, replyTo,
          subject: `Signed collaboration agreement · ${title || "Collaboration project"}`,
          text: `Hi ${printedName},\n\nYour signed collaboration agreement is attached. A copy is also available from your private review link until it expires.\n\nCHXNDLER`,
          html: `<div style="font:15px/1.6 Arial,sans-serif;color:#17171c"><p>Hi ${escapeHtml(printedName)},</p><p>Your signed collaboration agreement is attached to this email for your records.</p><p>CHXNDLER</p></div>`,
          attachments: [{ filename: `CHXNDLER-${row.agreement_access_version}-Signed-Agreement.html`, content: contract, contentType: "text/html; charset=utf-8" }],
        });
        await db.from("collaboration_requests").update({ collaborator_signature_email_sent_at: new Date().toISOString() }).eq("id", row.id).eq("collaborator_signed_version", row.agreement_access_version);
        emailSent = true;
      } catch (error) {
        console.error("[collab/agreement] signed copy email failed", error);
      } finally { try { transport?.close(); } catch {} }
    }
    return NextResponse.json({ ok: true, emailSent, email: row.email }, { headers: privateHeaders });
  } catch (error) {
    console.error("[collab/agreement] signing failed", error);
    return NextResponse.json({ error: "Unable to sign this agreement right now. Please try again or contact CHXNDLER." }, { status: 500, headers: privateHeaders });
  }
}
