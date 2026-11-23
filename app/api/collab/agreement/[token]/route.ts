import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies, headers as requestHeaders } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { agreementTypes, type AgreementType } from "@/lib/collaborationAgreements";
import { createSignedAgreementPdf } from "@/lib/signedAgreementPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
type Context = { params: Promise<{ token: string }> };

async function findAgreement(token: string) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const tokenHash = hash(token);
  const db = getSupabaseAdmin();
  const { data } = await db.from("collaboration_requests").select("id,song_id,invite_id,authorized_person_id,email,status,agreement_status,agreement_type,agreement_terms,agreement_version,agreement_approved_version,agreement_access_expires_at,agreement_access_version,agreement_access_token_hash,collaborator_printed_name,collaborator_signature,collaborator_signed_at,collaborator_signed_version,collaborator_signature_email_sent_at,admin_signed_at,songs(title)").eq("agreement_access_token_hash", tokenHash).maybeSingle();
  if (!data || !data.agreement_access_expires_at || Date.parse(data.agreement_access_expires_at) <= Date.now() || data.agreement_access_version !== data.agreement_approved_version || data.agreement_access_version !== data.agreement_version) return null;
  const { data: snapshot } = await db.from("collaboration_agreement_versions").select("structured_terms,agreement_type,version").eq("request_id", data.id).eq("version", data.agreement_access_version).maybeSingle();
  const agreementType = snapshot?.agreement_type || data.agreement_type;
  if (!agreementType || !agreementTypes.some(item => item.value === agreementType) || snapshot?.version !== undefined && snapshot.version !== data.agreement_access_version) return null;
  return { db, row: data, agreementType: agreementType as AgreementType, terms: (snapshot?.structured_terms || data.agreement_terms || {}) as Record<string, any> };
}

export async function POST(request: Request, { params }: Context) {
  const { token } = await params;
  try {
    const body = await request.json();
    const firstName = String(body.firstName || "").trim(), lastName = String(body.lastName || "").trim();
    const printedName = String(body.printedName || "").trim(), signature = String(body.signature || "").trim();
    if (!body.consent || !firstName || !lastName || !printedName || signature !== printedName || firstName.length > 80 || lastName.length > 80 || printedName.length > 160) return NextResponse.json({ error: "Enter your name, apply your signature, and confirm your agreement." }, { status: 400, headers: privateHeaders });
    const found = await findAgreement(token);
    if (!found) return NextResponse.json({ error: "This agreement link is invalid or has expired. Ask for a new link." }, { status: 404, headers: privateHeaders });
    const { db, row, terms } = found;
    if (row.collaborator_signed_version === row.agreement_access_version && row.collaborator_signed_at) return NextResponse.json({ ok: true, alreadySigned: true, executed: row.agreement_status === "signed", emailSent: !!row.collaborator_signature_email_sent_at }, { headers: privateHeaders });
    const jar = await cookies();
    const session = jar.get(`agreement_verified_${row.id}`)?.value || "";
    const { data: verified } = await db.from("collaboration_requests").select("agreement_verified_session_hash,agreement_verified_session_expires_at").eq("id", row.id).maybeSingle();
    if (!session || hash(session) !== verified?.agreement_verified_session_hash || !verified.agreement_verified_session_expires_at || Date.parse(verified.agreement_verified_session_expires_at) < Date.now()) return NextResponse.json({ error: "Verify your email before signing this agreement." }, { status: 401, headers: privateHeaders });
    if (row.agreement_status !== "awaiting_signature" || row.status !== "agreement_pending") return NextResponse.json({ error: "This agreement is no longer available for signature." }, { status: 409, headers: privateHeaders });

    const signedAt = new Date().toISOString();
    const requestHeaderList = await requestHeaders();
    const ip = (requestHeaderList.get("x-forwarded-for") || requestHeaderList.get("x-real-ip") || "").split(",")[0].trim().slice(0, 80);
    const userAgent = (requestHeaderList.get("user-agent") || "").slice(0, 500);
    const snapshotHash = hash(JSON.stringify({ requestId: row.id, version: row.agreement_access_version, type: found.agreementType, terms }));
    const fullyExecuted = !!row.admin_signed_at;
    const update = await db.from("collaboration_requests").update({ status: fullyExecuted ? "signed" : row.status, agreement_status: fullyExecuted ? "signed" : "awaiting_signature", signed_at: fullyExecuted ? signedAt : null, signed_agreement_version: fullyExecuted ? row.agreement_access_version : null, collaborator_first_name: firstName, collaborator_last_name: lastName, collaborator_printed_name: printedName, collaborator_signature: signature, collaborator_signed_at: signedAt, collaborator_signed_version: row.agreement_access_version, collaborator_signature_consent_at: signedAt, collaborator_signature_ip: ip || null, collaborator_signature_user_agent: userAgent || null, collaborator_signed_snapshot_hash: snapshotHash, agreement_verified_session_hash: null, agreement_verified_session_expires_at: null, updated_at: signedAt }).eq("id", row.id).eq("agreement_access_token_hash", hash(token)).eq("agreement_version", row.agreement_access_version).eq("agreement_approved_version", row.agreement_access_version).eq("agreement_status", "awaiting_signature").is("collaborator_signed_at", null).select("id").maybeSingle();
    if (update.error || !update.data) return NextResponse.json({ error: "The agreement changed before signing could be recorded. Contact CHXNDLER." }, { status: 409, headers: privateHeaders });
    await db.from("collaboration_request_events").insert({ request_id: row.id, event: "collaborator_signed_online", details: { signer: printedName, signer_email: row.email, version: row.agreement_access_version, signed_at: signedAt, ip, user_agent: userAgent, consent: true, snapshot_hash: snapshotHash } });

    let pdfHash: string | null = null;
    let executedPdf: Buffer | null = null;
    if (fullyExecuted) {
      const songRelation = Array.isArray(row.songs) ? row.songs[0] : row.songs;
      const pdf = await createSignedAgreementPdf({ id: row.id, version: row.agreement_access_version, song: songRelation?.title || "Collaboration project", type: found.agreementType, terms, collaboratorSignature: signature, collaboratorSignedAt: signedAt, adminSignedAt: row.admin_signed_at!, snapshotHash });
      executedPdf = pdf;
      const path = `${row.id}/signed-v${row.agreement_access_version}.pdf`;
      const uploaded = await db.storage.from("collaboration-agreements").upload(path, pdf, { contentType: "application/pdf", upsert: false });
      if (uploaded.error && !String(uploaded.error.message || "").toLowerCase().includes("already exists")) return NextResponse.json({ error: "Your signature is recorded, but PDF finalization failed. Contact CHXNDLER; do not sign again." }, { status: 500, headers: privateHeaders });
      pdfHash = hash(pdf);
      await db.from("collaboration_requests").update({ signed_agreement_hash: pdfHash, signed_agreement_path: path }).eq("id", row.id).eq("collaborator_signed_version", row.agreement_access_version);
    }

    let emailSent = false;
    const fromAddress = process.env.SMTP_FROM, replyTo = process.env.COLLAB_REPLY_TO || fromAddress;
    if (fullyExecuted && row.email && process.env.SMTP_HOST && fromAddress && replyTo && process.env.SMTP_USER && process.env.SMTP_PASS) {
      let transport: import("nodemailer").Transporter | null = null;
      try {
        const nodemailer = await import("nodemailer"), port = Number(process.env.SMTP_PORT || 587);
        transport = nodemailer.default.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
        const title = Array.isArray(row.songs) ? row.songs[0]?.title : (row.songs as any)?.title;
        if (!executedPdf) throw new Error("Signed PDF content unavailable for the completion email.");
        await transport.sendMail({ from: `CHXNDLER <${fromAddress}>`, to: row.email, replyTo, subject: `Signed collaboration agreement · ${title || "Collaboration project"}`, text: `Hi ${printedName},\n\nYour collaboration agreement is fully signed. The signed PDF is attached and available from your private CHXNDLER agreement link.\n\nCHXNDLER`, html: `<div style="font:15px/1.6 Arial,sans-serif;color:#17171c"><p>Hi ${printedName},</p><p>Your collaboration agreement is fully signed. The signed PDF is attached and available securely from your private CHXNDLER agreement link.</p><p>CHXNDLER</p></div>`, attachments: [{ filename: `CHXNDLER-Collaboration-Agreement-v${row.agreement_access_version}.pdf`, content: executedPdf, contentType: "application/pdf" }] });
        await db.from("collaboration_requests").update({ collaborator_signature_email_sent_at: new Date().toISOString() }).eq("id", row.id).eq("collaborator_signed_version", row.agreement_access_version);
        emailSent = true;
      } catch (error) { console.error("[collab/agreement] completion email failed", error); }
      finally { try { transport?.close(); } catch {} }
    }
    return NextResponse.json({ ok: true, executed: fullyExecuted, emailSent, email: row.email, pdfHash }, { headers: privateHeaders });
  } catch (error) {
    console.error("[collab/agreement] signing failed", error);
    return NextResponse.json({ error: "Unable to sign this agreement right now. Please try again or contact CHXNDLER." }, { status: 500, headers: privateHeaders });
  }
}
