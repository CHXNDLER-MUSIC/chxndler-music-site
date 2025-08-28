import { NextResponse } from "next/server";
const WEBHOOK = process.env.JOIN_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbw9g8a-jE-50HtsTQTSl22eSTxBWoho57p89C4IKdKZb9p1tTFJPFEx9w3anyvUYDoX5Q/exec";

export async function POST(req: Request) {
  const body = await req.json().catch(()=> ({} as any));
  // Normalize inputs; do NOT mirror phone into email so phone-only fills only Column B
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  // Put timestamp first so typical Object.values(payload) appends as
  // [A: ts, B: email, C: phone] in Google Sheets.
  const payload = { ts: Date.now(), email, phone } as const;

  try {
    await fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
  } catch {}

  return NextResponse.json({ ok: true });
}
