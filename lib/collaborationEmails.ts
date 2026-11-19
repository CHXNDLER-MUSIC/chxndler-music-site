import { songCoverPath } from "@/lib/songCover";

export type CollaborationEmailRequest = {
  id: string; artist_name: string; email: string; profile_link: string | null; phone: string | null;
  contribution_type: string; message: string | null; submitted_at: string;
  songs?: { title: string; slug: string } | null;
};
export type EmailRecipient = "admin" | "artist";
export type EmailDelivery = { status: "sent" | "failed" | "skipped"; messageId: string | null; error: string | null };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export async function sendCollaborationEmails(request: CollaborationEmailRequest, baseUrl: string, recipients: EmailRecipient[] = ["admin", "artist"]): Promise<Record<EmailRecipient, EmailDelivery>> {
  const skipped: EmailDelivery = { status: "skipped", messageId: null, error: null };
  const result: Record<EmailRecipient, EmailDelivery> = { admin: { ...skipped }, artist: { ...skipped } };
  const host = process.env.SMTP_HOST, fromAddress = process.env.SMTP_FROM, adminAddress = process.env.COLLAB_NOTIFICATION_EMAIL;
  const replyTo = process.env.COLLAB_REPLY_TO || fromAddress;
  if (!host || !fromAddress || !replyTo || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    const error = "SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, and COLLAB_REPLY_TO (or SMTP_FROM) must be configured.";
    for (const recipient of recipients) result[recipient] = { status: "failed", messageId: null, error };
    return result;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  let transport: import("nodemailer").Transporter;
  try {
    const nodemailer = await import("nodemailer");
    transport = nodemailer.default.createTransport({ host, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 500) : "Email service could not be initialized.";
    console.error("[collab] email transport initialization failed", error);
    for (const recipient of recipients) result[recipient] = { status: "failed", messageId: null, error: detail };
    return result;
  }
  const from = `CHXNDLER <${fromAddress}>`, songTitle = request.songs?.title || "CHXNDLER track";
  const detailUrl = `${baseUrl}/admin/collaborations?request=${encodeURIComponent(request.id)}`;
  const cover = request.songs?.slug ? `${baseUrl}${songCoverPath(request.songs.slug, songTitle)}` : "";
  const message = request.message || "No message provided";
  const profile = request.profile_link || "Not provided", phone = request.phone || "Not provided";
  const content = `<div style="background:#09090c;color:#fff;padding:28px;font:15px Arial"><h1 style="color:#ff3ea5">New Collab Request</h1>${cover ? `<img src="${escapeHtml(cover)}" width="120" alt="${escapeHtml(songTitle)} artwork">` : ""}<p><b>Song:</b> ${escapeHtml(songTitle)}</p><p><b>Artist:</b> ${escapeHtml(request.artist_name)}</p><p><b>Email:</b> ${escapeHtml(request.email)}</p><p><b>Profile:</b> ${escapeHtml(profile)}</p><p><b>Phone:</b> ${escapeHtml(phone)}</p><p><b>Contribution:</b> ${escapeHtml(request.contribution_type)}</p><p><b>Idea:</b><br>${escapeHtml(message)}</p><p><b>Submitted:</b> ${escapeHtml(new Date(request.submitted_at).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" }))}</p><a style="display:inline-block;padding:12px 18px;background:#ff3ea5;color:#09090c;text-decoration:none;font-weight:bold" href="${escapeHtml(detailUrl)}">View Request →</a></div>`;

  for (const recipient of recipients) {
    try {
      let response;
      if (recipient === "admin") {
        if (!adminAddress) throw new Error("COLLAB_NOTIFICATION_EMAIL is not configured.");
        response = await transport.sendMail({ from, to: adminAddress, replyTo, subject: `New Collab Request: ${songTitle} — ${request.artist_name}`, html: content });
      } else {
        response = await transport.sendMail({
          from, to: request.email, replyTo,
          subject: "Your Collab Request — CHXNDLER",
          text: `Hey ${request.artist_name},\n\nThanks for your interest in collaborating on ${songTitle}!\n\nI've received your request and will take a look. If it's a good fit, I'll reach out with next steps.\n\nTalk soon,\nCHXNDLER`,
          html: `<div style="background:#09090c;color:#fff;padding:28px;font:15px Arial"><h1 style="color:#ff3ea5">CHXNDLER</h1><p>Hey ${escapeHtml(request.artist_name)},</p><p>Thanks for your interest in collaborating on ${escapeHtml(songTitle)}!</p><p>I've received your request and will take a look. If it's a good fit, I'll reach out with next steps.</p><p>Talk soon,<br>CHXNDLER</p></div>`,
        });
      }
      result[recipient] = { status: "sent", messageId: response.messageId || null, error: null };
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Email delivery failed.";
      console.error(`[collab] ${recipient} notification failed`, error);
      result[recipient] = { status: "failed", messageId: null, error: messageText.slice(0, 500) };
    }
  }
  try { transport.close(); } catch (error) { console.error("[collab] email transport close failed", error); }
  return result;
}
