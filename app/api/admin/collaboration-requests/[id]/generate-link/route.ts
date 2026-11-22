import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { agreementTypes, validateAgreement, type AgreementType } from "@/lib/collaborationAgreements";
import { canTransitionCollaborationStatus } from "@/lib/collaborationRules.mjs";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: row, error } = await db.from("collaboration_requests")
    .select("id,song_id,invite_id,authorized_person_id,status,agreement_status,agreement_type,agreement_terms,agreement_version,agreement_approved_at,agreement_approved_version,agreement_template_id,agreement_template_version,agreement_path")
    .eq("id", id).maybeSingle();
  if (error || !row) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (row.agreement_status === "signed" || row.status === "signed") return NextResponse.json({ error: "This request already has a signed agreement." }, { status: 409 });
  if (!row.agreement_approved_at || row.agreement_approved_version !== row.agreement_version) return NextResponse.json({ error: "Approve the current agreement version before generating a link." }, { status: 409 });
  if (!row.agreement_type || !agreementTypes.some(type => type.value === row.agreement_type)) return NextResponse.json({ error: "Choose an agreement type and save the draft first." }, { status: 409 });
  const terms = (row.agreement_terms || {}) as Record<string, unknown>;
  const missing = validateAgreement(row.agreement_type as AgreementType, terms);
  if (missing.length) return NextResponse.json({ error: `Resolve required agreement terms first: ${missing.join(", ")}.` }, { status: 409 });
  if (row.status !== "agreement_pending" && !canTransitionCollaborationStatus(row.status, "agreement_pending")) return NextResponse.json({ error: "Approve the collaboration request before generating a contract link." }, { status: 409 });

  const { data: snapshot, error: snapshotError } = await db.from("collaboration_agreement_versions")
    .select("id").eq("request_id", id).eq("version", row.agreement_version).maybeSingle();
  if (snapshotError) return NextResponse.json({ error: "Could not verify the approved agreement version." }, { status: 500 });
  if (!snapshot) {
    const inserted = await db.from("collaboration_agreement_versions").insert({
      request_id: id, song_id: row.song_id, invite_id: row.invite_id, authorized_person_id: row.authorized_person_id,
      agreement_type: row.agreement_type, version: row.agreement_version, agreement_status: "approved",
      structured_terms: terms, agreement_template_id: row.agreement_template_id,
      agreement_template_version: row.agreement_template_version, document_path: row.agreement_path,
      created_by: auth.user.email || null,
    });
    if (inserted.error) return NextResponse.json({ error: "Could not save the approved agreement version." }, { status: 500 });
  }

  const accessToken = randomBytes(32).toString("base64url");
  const accessTokenHash = createHash("sha256").update(accessToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const update = await db.from("collaboration_requests").update({
    agreement_access_token_hash: accessTokenHash,
    agreement_access_expires_at: expiresAt,
    agreement_access_version: row.agreement_version,
    agreement_status: "awaiting_signature",
    agreement_sent_at: new Date().toISOString(),
    status: "agreement_pending",
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("agreement_version", row.agreement_version)
    .eq("agreement_approved_version", row.agreement_version).select("id").maybeSingle();
  if (update.error || !update.data) return NextResponse.json({ error: "Could not generate a private link for the approved contract." }, { status: 500 });

  await db.from("collaboration_request_events").insert({ request_id: id, event: "agreement_link_generated", details: { actor: auth.user.email, version: row.agreement_version, expires_at: expiresAt } });
  const base = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
  return NextResponse.json({ ok: true, version: row.agreement_version, agreement_status: "awaiting_signature", expiresAt, reviewUrl: `${base}/collab/agreement/${accessToken}` });
}
