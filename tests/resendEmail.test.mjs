import test from "node:test";
import assert from "node:assert/strict";
import { sendResendEmail } from "../lib/resendEmail.ts";

test("collaboration mail sends through Resend without SMTP credentials", async () => {
  const previous = {
    key: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM_EMAIL,
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFrom: process.env.SMTP_FROM,
    fetch: globalThis.fetch,
  };
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.RESEND_FROM_EMAIL = "agreements@example.com";
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FROM;

  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return Response.json({ id: "resend-message-123" }, { status: 200 });
  };

  try {
    const result = await sendResendEmail({
      to: "collaborator@example.com",
      subject: "Collaboration Agreement",
      text: "Review your agreement: https://example.com/collab/agreement/token",
      html: "<a href=\"https://example.com/collab/agreement/token\">Review</a>",
      idempotencyKey: "collaboration-agreement-request-v1",
    });
    assert.deepEqual(result, { id: "resend-message-123" });
    assert.equal(request.url, "https://api.resend.com/emails");
    assert.equal(request.options.headers.Authorization, "Bearer re_test_key");
    assert.equal(request.options.headers["Idempotency-Key"], "collaboration-agreement-request-v1");
    const body = JSON.parse(request.options.body);
    assert.equal(body.from, "CHXNDLER <agreements@example.com>");
    assert.deepEqual(body.to, ["collaborator@example.com"]);
    assert.match(body.text, /collab\/agreement\/token/);
  } finally {
    globalThis.fetch = previous.fetch;
    for (const [key, name] of [["key", "RESEND_API_KEY"], ["from", "RESEND_FROM_EMAIL"], ["smtpHost", "SMTP_HOST"], ["smtpUser", "SMTP_USER"], ["smtpPass", "SMTP_PASS"], ["smtpFrom", "SMTP_FROM"]]) {
      if (previous[key] === undefined) delete process.env[name];
      else process.env[name] = previous[key];
    }
  }
});
