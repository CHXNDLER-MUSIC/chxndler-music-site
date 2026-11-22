import { createHash, randomInt, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

async function lookup(token: string) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const db = getSupabaseAdmin();
  const { data } = await db.from("collaboration_requests").select("id,email,artist_name,agreement_status,agreement_version,agreement_approved_version,agreement_access_expires_at,agreement_access_version,agreement_access_token_hash,agreement_email_code_hash,agreement_email_code_expires_at,agreement_email_code_sent_at,agreement_email_code_attempts").eq("agreement_access_token_hash", hash(token)).maybeSingle();
  if (!data || !data.agreement_access_expires_at || Date.parse(data.agreement_access_expires_at) < Date.now() || data.agreement_access_version !== data.agreement_approved_version || data.agreement_access_version !== data.agreement_version) return null;
  return { db, row: data };
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await lookup(token);
  if (!found) return NextResponse.json({ error: "This private agreement link is unavailable." }, { status: 404, headers });
  const { db, row } = found;
  const body = await request.json().catch(() => ({}));
  if (body.action === "send-code") {
    if (!row.email || !process.env.SMTP_HOST || !process.env.SMTP_FROM || !process.env.SMTP_USER || !process.env.SMTP_PASS) return NextResponse.json({ error: "Email verification is temporarily unavailable. Please contact CHXNDLER." }, { status: 503, headers });
    if (row.agreement_email_code_sent_at && Date.now() - Date.parse(row.agreement_email_code_sent_at) < 60_000) return NextResponse.json({ error: "Please wait one minute before requesting another code." }, { status: 429, headers });
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const update = await db.from("collaboration_requests").update({ agreement_email_code_hash: hash(`${row.id}:${code}`), agreement_email_code_expires_at: expiresAt, agreement_email_code_sent_at: new Date().toISOString(), agreement_email_code_attempts: 0 }).eq("id", row.id).eq("agreement_access_token_hash", hash(token));
    if (update.error) return NextResponse.json({ error: "Could not prepare the verification email." }, { status: 500, headers });
    let transport: import("nodemailer").Transporter | null = null;
    try {
      const nodemailer = await import("nodemailer");
      const port = Number(process.env.SMTP_PORT || 587);
      transport = nodemailer.default.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
      const song = await db.from("collaboration_requests").select("songs(title)").eq("id", row.id).maybeSingle();
      const title = Array.isArray(song.data?.songs) ? song.data.songs[0]?.title : (song.data?.songs as any)?.title;
      await transport.sendMail({ from: `CHXNDLER <${process.env.SMTP_FROM}>`, to: row.email, replyTo: process.env.COLLAB_REPLY_TO || process.env.SMTP_FROM, subject: "Your CHXNDLER agreement verification code", text: `Your verification code for ${title || "your collaboration agreement"} is ${code}. It expires in 10 minutes. If you did not request it, you can ignore this email.`, html: `<div style="font:16px/1.6 Arial;color:#18171b"><p>Your CHXNDLER agreement verification code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#c3317e">${code}</p><p>It expires in 10 minutes. If you did not request it, ignore this email.</p></div>` });
      await db.from("collaboration_request_events").insert({ request_id: row.id, event: "agreement_email_code_sent", details: { version: row.agreement_access_version } });
      return NextResponse.json({ ok: true, maskedEmail: row.email.replace(/^(.{1,2}).*(@.*)$/, "$1•••$2") }, { headers });
    } catch (error) {
      await db.from("collaboration_requests").update({ agreement_email_code_hash: null, agreement_email_code_expires_at: null }).eq("id", row.id);
      console.error("[collab/agreement-access] code delivery failed", error);
      return NextResponse.json({ error: "We could not send the verification code. Please try again shortly." }, { status: 502, headers });
    } finally { try { transport?.close(); } catch {} }
  }
  if (body.action === "verify-code") {
    const code = String(body.code || "").trim();
    if (!/^\d{6}$/.test(code) || !row.agreement_email_code_hash || !row.agreement_email_code_expires_at || Date.parse(row.agreement_email_code_expires_at) < Date.now() || Number(row.agreement_email_code_attempts) >= 5) return NextResponse.json({ error: "That code is invalid or expired. Request a new one." }, { status: 400, headers });
    if (hash(`${row.id}:${code}`) !== row.agreement_email_code_hash) {
      await db.from("collaboration_requests").update({ agreement_email_code_attempts: Number(row.agreement_email_code_attempts || 0) + 1 }).eq("id", row.id).eq("agreement_email_code_hash", row.agreement_email_code_hash);
      return NextResponse.json({ error: "That code did not match. Check the email and try again." }, { status: 400, headers });
    }
    const session = randomBytes(32).toString("base64url");
    const sessionExpires = new Date(Date.now() + 2 * 60 * 60_000).toISOString();
    const update = await db.from("collaboration_requests").update({ agreement_email_code_hash: null, agreement_email_code_expires_at: null, agreement_verified_session_hash: hash(session), agreement_verified_session_expires_at: sessionExpires }).eq("id", row.id).eq("agreement_email_code_hash", row.agreement_email_code_hash).eq("agreement_access_version", row.agreement_version);
    if (update.error) return NextResponse.json({ error: "Could not confirm this verification. Please request a new code." }, { status: 500, headers });
    const jar = await cookies();
    jar.set(`agreement_verified_${row.id}`, session, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: `/api/collab/agreement/${token}`, expires: new Date(sessionExpires) });
    await db.from("collaboration_request_events").insert({ request_id: row.id, event: "agreement_recipient_verified", details: { version: row.agreement_access_version, verified_at: new Date().toISOString() } });
    return NextResponse.json({ ok: true }, { headers });
  }
  return NextResponse.json({ error: "Unknown verification action." }, { status: 400, headers });
}
