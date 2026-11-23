import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { canMarkAgreementSigned, canTransitionCollaborationStatus } from "@/lib/collaborationRules.mjs";
import { agreementHtml, agreementTemplates, validateAgreement, type AgreementType } from "@/lib/collaborationAgreements";

const AGREEMENT_BUCKET = "collaboration-agreements";

export async function GET(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const db = getSupabaseAdmin(), id = new URL(request.url).searchParams.get("id");
  let query = db.from("collaboration_requests").select("*, songs(title,slug), collaboration_invites(display_name,first_name,last_name,artist_name,contribution_type,agreement_type)").order("submitted_at", { ascending: false });
  if (id) query = query.eq("id", id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load requests." }, { status: 500 });
  if (id && data?.[0]) {
    const [{ data: events }, { data: versions }] = await Promise.all([
      db.from("collaboration_request_events").select("*").eq("request_id", id).order("created_at", { ascending: true }),
      db.from("collaboration_agreement_versions").select("*").eq("request_id", id).order("version", { ascending: false }),
    ]);
    const requestRow = data[0];
    const [draft, signed] = await Promise.all([
      requestRow.agreement_path ? db.storage.from(AGREEMENT_BUCKET).createSignedUrl(requestRow.agreement_path, 60 * 5) : Promise.resolve({ data: null }),
      requestRow.signed_agreement_path ? db.storage.from(AGREEMENT_BUCKET).createSignedUrl(requestRow.signed_agreement_path, 60 * 5) : Promise.resolve({ data: null }),
    ]);
    const versionRows = await Promise.all((versions || []).map(async version => {
      const document = version.document_path ? await db.storage.from(AGREEMENT_BUCKET).createSignedUrl(version.document_path, 60 * 5) : { data: null };
      const executed = version.signed_document_path ? await db.storage.from(AGREEMENT_BUCKET).createSignedUrl(version.signed_document_path, 60 * 5) : { data: null };
      return { ...version, document_url: document.data?.signedUrl || null, signed_document_url: executed.data?.signedUrl || null };
    }));
    return NextResponse.json({ request: { ...requestRow, agreement_url: draft.data?.signedUrl || null, signed_agreement_url: signed.data?.signedUrl || null, agreementVersions: versionRows }, events: events || [], agreementVersions: versionRows });
  }
  return NextResponse.json({ requests: data || [] });
}

export async function PATCH(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json(), id = String(body.id || ""), db = getSupabaseAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { data: current, error: currentError } = await db.from("collaboration_requests").select("status,agreement_status,agreement_path,signed_agreement_path,signed_agreement_version,agreement_type,agreement_terms,agreement_version,agreement_approved_at,agreement_approved_by,agreement_approved_version,agreement_template_id,agreement_template_version,song_id,music_video_project_id,invite_id,authorized_person_id,contribution_type,artist_name,email,profile_link,portfolio_url,estimated_rate,first_name,last_name,songs(title)").eq("id", id).maybeSingle();
  if (currentError || !current) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const stable = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).filter(([key]) => key !== "contract_html").sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
    return JSON.stringify(value);
  };
  const requestedType = body.agreement_type ?? current.agreement_type ?? "singer_feature";
  const agreementChanged = body.agreement_type !== undefined && body.agreement_type !== current.agreement_type ||
    body.agreement !== undefined && stable(body.agreement) !== stable(current.agreement_terms || {}) ||
    body.agreement !== undefined && !current.agreement_version;
  if (current.agreement_status === "signed" && (agreementChanged || body.approve_agreement !== undefined || (body.agreement_status !== undefined && body.agreement_status !== "completed"))) {
    return NextResponse.json({ error: "This agreement is signed and immutable. Use a new amendment version for any changes." }, { status: 409 });
  }
  const allowed = ["new","reviewing","approved","declined","agreement_pending","signed","in_progress","completed","canceled","archived"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.agreement_type !== undefined && !agreementTemplates[requestedType as AgreementType]) return NextResponse.json({ error: "Choose a valid agreement type." }, { status: 400 });
  if (body.agreement_type !== undefined) update.agreement_type = requestedType;
  if (body.agreement !== undefined) {
    if (!body.agreement || typeof body.agreement !== "object" || Array.isArray(body.agreement)) return NextResponse.json({ error: "Agreement terms must be an object." }, { status: 400 });
    if (Object.values(body.agreement as Record<string, unknown>).some(value => !(typeof value === "string" || typeof value === "number" || value === null) || (typeof value === "string" && value.length > 12000))) return NextResponse.json({ error: "Agreement fields must be text or numbers under 12,000 characters." }, { status: 400 });
    if (!agreementTemplates[requestedType as AgreementType]) return NextResponse.json({ error: "Choose a valid agreement type." }, { status: 400 });
    const version = agreementChanged ? (current.agreement_version || 0) + 1 : (current.agreement_version || 1);
    const template = agreementTemplates[requestedType as AgreementType];
    const savedTerms = (current.agreement_terms || {}) as Record<string, any>;
    const changingType = requestedType !== current.agreement_type;
    const templateId = !changingType ? savedTerms.template_id || current.agreement_template_id || body.agreement.template_id || template.id : template.id;
    const templateVersion = !changingType ? savedTerms.template_version || current.agreement_template_version || body.agreement.template_version || template.version : template.version;
    const terms = { ...body.agreement, agreement_type: requestedType, agreement_version: version, template_id: templateId, template_version: templateVersion } as Record<string, any>;
    if (agreementChanged) terms.reviewed_pdf = "false";
    terms.contract_html = agreementHtml(requestedType as AgreementType, terms);
    update.agreement_terms = terms;
    update.agreement_template_id = templateId;
    update.agreement_template_version = templateVersion;
    update.agreement_version = version;
    update.flat_fee = Number(terms.flat_fee ?? 0);
    update.master_royalty = Number(terms.master_royalty ?? 0);
    update.publishing_royalty = ["negotiated", "co_writer"].includes(String(terms.songwriting_status)) && (terms.songwriting_split ?? terms.publishing_split) !== "" ? Number(terms.songwriting_split ?? terms.publishing_split) : null;
  }
  if (agreementChanged) {
    update.agreement_approved_at = null; update.agreement_approved_by = null; update.agreement_approved_version = null;
    update.agreement_path = null; update.agreement_status = "draft"; update.agreement_sent_at = null;
    update.agreement_access_token_hash = null; update.agreement_access_expires_at = null; update.agreement_access_version = null;
  }
  if (body.approve_agreement === true) {
    const type = requestedType as AgreementType;
    const terms = (update.agreement_terms || current.agreement_terms || {}) as Record<string, any>;
    const missing = validateAgreement(type, terms);
    if (missing.length) return NextResponse.json({ error: `Complete these essential terms before approval: ${missing.join(", ")}.` }, { status: 400 });
    update.agreement_approved_at = new Date().toISOString();
    update.agreement_approved_by = auth.user.email || "admin";
    update.agreement_approved_version = update.agreement_version as number || current.agreement_version || 1;
  }
  if (body.approve_agreement === false) {
    update.agreement_approved_at = null; update.agreement_approved_by = null; update.agreement_approved_version = null;
    update.agreement_access_token_hash = null; update.agreement_access_expires_at = null; update.agreement_access_version = null;
    update.agreement_status = "draft"; update.agreement_sent_at = null;
  }
  if (typeof body.status === "string" && allowed.includes(body.status)) {
    if (!canTransitionCollaborationStatus(current.status, body.status)) return NextResponse.json({ error: `Cannot move a request from ${current.status} to ${body.status}.` }, { status: 409 });
    update.status = body.status;
    if (["reviewing","approved","declined"].includes(body.status)) update.reviewed_at = new Date().toISOString();
  }
  if (body.status !== undefined && (typeof body.status !== "string" || !allowed.includes(body.status))) return NextResponse.json({ error: "Invalid request status." }, { status: 400 });
  if (body.project_status !== undefined) {
    if (typeof body.project_status !== "string" || !["requested", "in_progress", "completed", "canceled"].includes(body.project_status)) return NextResponse.json({ error: "Invalid project status." }, { status: 400 });
    update.project_status = body.project_status;
  }
  if (body.status === "signed") {
    const signedPath = current.signed_agreement_path;
    if (typeof signedPath !== "string" || !signedPath || current.signed_agreement_version !== current.agreement_approved_version || current.agreement_approved_version !== current.agreement_version) return NextResponse.json({ error: "Upload executed signature evidence for the exact approved agreement version before verification." }, { status: 409 });
    const folder = signedPath.slice(0, signedPath.lastIndexOf("/")), filename = signedPath.split("/").pop();
    const { data: files, error: storageError } = await db.storage.from(AGREEMENT_BUCKET).list(folder, { search: filename, limit: 50 });
    const exists = !storageError && !!files?.some((file) => file.name === filename);
    if (!canMarkAgreementSigned({ signedVerified: body.signedVerified, agreementPath: signedPath, verifiedDocumentExists: exists })) {
      return NextResponse.json({ error: "Review the uploaded signed PDF and confirm every required signature is present." }, { status: 409 });
    }
    update.agreement_status = "signed"; update.signed_at = new Date().toISOString();
  }
  if (typeof body.internal_notes === "string") update.internal_notes = body.internal_notes.slice(0, 10000);
  for (const field of ["admin_legal_name", "artist_credit", "agreed_ownership_terms", "agreed_distribution_permissions", "agreed_release_restrictions", "agreed_credit_requirements"] as const) {
    if (typeof body[field] === "string") update[field] = body[field].slice(0, 10000);
  }
  for (const field of ["master_royalty", "publishing_royalty", "flat_fee"] as const) {
    if (body[field] === null || body[field] === "") update[field] = null;
    else if (typeof body[field] === "number" && Number.isFinite(body[field])) {
      if (field !== "flat_fee" && (body[field] < 0 || body[field] > 100)) return NextResponse.json({ error: "Royalty percentages must be between 0 and 100." }, { status: 400 });
      if (field === "flat_fee" && body[field] < 0) return NextResponse.json({ error: "Fee cannot be negative." }, { status: 400 });
      update[field] = body[field];
    }
  }
  if (typeof body.agreement_status === "string" && ["draft","offer_sent","negotiating","awaiting_signature","declined","cancelled","completed","not_started","pending","sent"].includes(body.agreement_status)) {
    if (body.agreement_status === "signed") return NextResponse.json({ error: "Mark the request Signed only after uploading and verifying the executed agreement." }, { status: 409 });
    if (["awaiting_signature", "sent"].includes(body.agreement_status)) return NextResponse.json({ error: "Use the Send for Signature action to email the approved reviewed PDF and record delivery." }, { status: 409 });
    if (["offer_sent", "awaiting_signature", "sent"].includes(body.agreement_status)) {
      if (!current.agreement_path) return NextResponse.json({ error: "Upload the reviewed agreement PDF before marking it sent." }, { status: 409 });
      if (!body.approve_agreement && !current.agreement_approved_at) return NextResponse.json({ error: "Approve the saved agreement terms before sending." }, { status: 409 });
      if (current.status !== "agreement_pending" && !canTransitionCollaborationStatus(current.status, "agreement_pending")) return NextResponse.json({ error: "Approve the request before sending an agreement." }, { status: 409 });
      update.agreement_sent_at = new Date().toISOString();
      if (!body.status) update.status = "agreement_pending";
      if (body.agreement_status === "sent") update.agreement_status = "awaiting_signature";
      else update.agreement_status = body.agreement_status;
    } else if (body.agreement_status !== "draft" || agreementChanged || !current.agreement_version) {
      update.agreement_status = body.agreement_status === "not_started" || body.agreement_status === "pending" ? "draft" : body.agreement_status;
    }
  }
  const saveAgreementSnapshot = agreementChanged;
  const { data, error } = await db.from("collaboration_requests").update(update).eq("id", id).select("id,status,agreement_status,agreement_type,agreement_version,agreement_terms,agreement_template_id,agreement_template_version,agreement_approved_at,agreement_approved_by,agreement_approved_version").single();
  if (error) return NextResponse.json({ error: "Unable to update request." }, { status: 500 });
  if (saveAgreementSnapshot) {
    const snapshot = await db.from("collaboration_agreement_versions").insert({
      request_id: id, song_id: current.song_id, invite_id: current.invite_id, authorized_person_id: current.authorized_person_id,
      agreement_type: (update.agreement_type || current.agreement_type || "singer_feature"), version: update.agreement_version,
      agreement_status: "draft", structured_terms: update.agreement_terms || current.agreement_terms || {},
      agreement_template_id: update.agreement_template_id || current.agreement_template_id,
      agreement_template_version: update.agreement_template_version || current.agreement_template_version,
      document_path: update.agreement_path !== undefined ? update.agreement_path : current.agreement_path,
      signed_document_path: current.signed_agreement_path, created_by: auth.user.email || null,
    });
    if (snapshot.error) return NextResponse.json({ error: "The request was updated, but its version snapshot could not be saved. Do not retry until the history is reviewed." }, { status: 500 });
  }
  if (current.contribution_type === "Music Video" && ["approved", "in_progress", "completed"].includes(String(body.status || ""))) {
    const stage = body.status === "approved" ? "Confirmed" : body.status === "in_progress" ? "Production" : "Delivered";
    const { data: created } = current.music_video_project_id ? { data: null } : await db.from("music_video_projects").upsert({ song_id: current.song_id, project_type: "primary", collaboration_stage: stage }, { onConflict: "song_id,project_type", ignoreDuplicates: true }).select("id").maybeSingle();
    const existing = created || current.music_video_project_id ? null : await db.from("music_video_projects").select("id").eq("song_id", current.song_id).eq("project_type", "primary").maybeSingle();
    const projectId = current.music_video_project_id || created?.id || existing?.data?.id;
    if (projectId) {
      const assigned = body.status === "approved" ? { name: current.artist_name, email: current.email, portfolio: current.portfolio_url || current.profile_link || "", estimatedRate: current.estimated_rate || "", applicationId: id, role: "Videographer" } : undefined;
      await db.from("music_video_projects").update({ collaboration_stage: stage, ...(assigned ? { assigned_videographer: assigned } : {}) }).eq("id", projectId);
      await db.from("collaboration_requests").update({ music_video_project_id: projectId, project_status: body.status === "completed" ? "completed" : body.status === "in_progress" ? "in_progress" : "requested" }).eq("id", id);
    }
  }
  if (body.status || body.agreement_status || body.internal_notes || agreementChanged || body.approve_agreement !== undefined || Object.keys(update).length > 1) {
    await db.from("collaboration_request_events").insert({ request_id: id, event: body.status === "signed" ? "signed" : body.approve_agreement ? "agreement_approved" : body.agreement_status || (agreementChanged ? "agreement_draft_saved" : "request_updated"), details: { actor: auth.user.email, version: data.agreement_version, updates: Object.keys(update).filter((key) => key !== "updated_at") } });
  }
  return NextResponse.json({ request: data });
}
