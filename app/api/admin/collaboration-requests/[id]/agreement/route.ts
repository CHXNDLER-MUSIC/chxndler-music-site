import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
const BUCKET = "collaboration-agreements";
const cleanName = (name: string) => name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "agreement.pdf";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const form = await request.formData(), file = form.get("file"), type = form.get("type");
  if (!(file instanceof File) || file.type !== "application/pdf" || file.size < 1 || file.size > 10 * 1024 * 1024 || !["draft", "signed"].includes(String(type))) {
    return NextResponse.json({ error: "Upload a PDF agreement no larger than 10 MB." }, { status: 400 });
  }
  const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (signature !== "%PDF-") return NextResponse.json({ error: "The selected file is not a valid PDF." }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: row } = await db.from("collaboration_requests").select("id,agreement_status").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const path = `${id}/${String(type)}-${Date.now()}-${randomUUID()}-${cleanName(file.name)}`;
  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, file, { contentType: "application/pdf", upsert: false });
  if (uploadError) return NextResponse.json({ error: "Could not upload the private agreement. Confirm the storage migration is applied." }, { status: 500 });
  const update = type === "signed" ? { signed_agreement_path: path } : { agreement_path: path };
  const { error: updateError } = await db.from("collaboration_requests").update(update).eq("id", id);
  if (updateError) {
    await db.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "The file uploaded but its request record could not be updated." }, { status: 500 });
  }
  await db.from("collaboration_request_events").insert({ request_id: id, event: type === "signed" ? "signed_agreement_uploaded" : "agreement_uploaded", details: { actor: auth.user.email, fileName: cleanName(file.name) } });
  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 5);
  return NextResponse.json({ ok: true, path, url: signed?.signedUrl || null });
}
