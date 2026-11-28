type ResendEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey?: string;
};

function configuredFromAddress() {
  return process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM || process.env.EMAIL_FROM;
}

export async function sendResendEmail(email: ResendEmail): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = configuredFromAddress();
  if (!apiKey || !fromAddress) {
    throw new Error("Resend email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL (or RESEND_FROM).");
  }

  const from = fromAddress.includes("<") ? fromAddress : `CHXNDLER <${fromAddress}>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      reply_to: email.replyTo || process.env.COLLAB_REPLY_TO || fromAddress,
    }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
  if (!response.ok || !result.id) {
    throw new Error(result.message || `Resend rejected the agreement email (${response.status}).`);
  }
  return { id: result.id };
}
