import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { agreementHtml, agreementTypeForContribution } from "@/lib/collaborationAgreements";

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
  const { data: row, error: lookupError } = await db.from("collaboration_requests").select("id,song_id,invite_id,authorized_person_id,status,agreement_status,agreement_type,agreement_version,agreement_approved_at,agreement_approved_version,agreement_template_id,agreement_template_version,agreement_terms,agreement_path,signed_agreement_path,signed_agreement_version,contribution_type,admin_legal_name,artist_credit,master_royalty,publishing_royalty,flat_fee").eq("id", id).maybeSingle();
  if (lookupError) { console.error("[admin/collaboration-upload] lookup failed", { id, code: lookupError.code, message: lookupError.message }); return NextResponse.json({ error: "Unable to look up this collaboration request. Refresh the request and try again." }, { status: 500 }); }
  if (!row) return NextResponse.json({ error: `Request ${id} was not found in collaboration_requests. Refresh the list to confirm it is still available.` }, { status: 404 });
  if (row.agreement_status === "signed" || row.status === "signed") return NextResponse.json({ error: "Signed agreement records are immutable. Create an amendment version instead." }, { status: 409 });
  if (type === "signed" && (!['awaiting_signature', 'sent'].includes(row.agreement_status) || !row.agreement_approved_at || row.agreement_approved_version !== row.agreement_version)) return NextResponse.json({ error: "A fully executed PDF can only be uploaded for the current approved agreement version after it has been sent." }, { status: 409 });
  const path = `${id}/${String(type)}-${Date.now()}-${randomUUID()}-${cleanName(file.name)}`;
  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, file, { contentType: "application/pdf", upsert: false });
  if (uploadError) return NextResponse.json({ error: "Could not upload the private agreement. Confirm the storage migration is applied." }, { status: 500 });
  const agreementType = row.agreement_type || agreementTypeForContribution(row.contribution_type);
  const version = type === "draft" ? (row.agreement_version || 0) + 1 : row.agreement_approved_version;
  const legacyTerms = row.agreement_terms && Object.keys(row.agreement_terms).length ? row.agreement_terms : {
    admin_legal_name: row.admin_legal_name || "Chandler Pierce", admin_artist_name: "CHXNDLER", artist_credit: row.artist_credit || "",
    master_royalty: row.master_royalty, publishing_split: row.publishing_royalty, flat_fee: row.flat_fee,
  };
  const snapshotTerms = type === "draft" ? { ...legacyTerms, agreement_version: version, reviewed_pdf: "true" } : legacyTerms;
  if (type === "draft") snapshotTerms.contract_html = agreementHtml(agreementType, snapshotTerms);
  const update = type === "signed"
    ? { signed_agreement_path: path, signed_agreement_version: version }
    : { agreement_path: path, agreement_version: version, agreement_terms: snapshotTerms, agreement_status: "draft", agreement_approved_at: null, agreement_approved_by: null, agreement_approved_version: null };
  const { error: updateError } = await db.from("collaboration_requests").update(update).eq("id", id);
  if (updateError) {
    await db.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "The file uploaded but its request record could not be updated." }, { status: 500 });
  }
  if (type === "draft") {
    const { error: versionError } = await db.from("collaboration_agreement_versions").insert({ request_id: id, song_id: row.song_id, invite_id: row.invite_id, authorized_person_id: row.authorized_person_id, agreement_type: agreementType, version, agreement_status: "draft", structured_terms: snapshotTerms, agreement_template_id: row.agreement_template_id, agreement_template_version: row.agreement_template_version, document_path: path, created_by: auth.user.email || null });
    if (versionError) return NextResponse.json({ error: "The reviewed PDF was uploaded, but its immutable version record could not be saved. Review the request before retrying." }, { status: 500 });
  }
  await db.from("collaboration_request_events").insert({ request_id: id, event: type === "signed" ? "signed_agreement_uploaded" : "agreement_uploaded", details: { actor: auth.user.email, fileName: cleanName(file.name), version } });
  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 5);
  return NextResponse.json({ ok: true, path, url: signed?.signedUrl || null, version });
}
