import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { canMarkAgreementSigned, canTransitionCollaborationStatus } from "@/lib/collaborationRules.mjs";

const AGREEMENT_BUCKET = "collaboration-agreements";

export async function GET(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const db = getSupabaseAdmin(), id = new URL(request.url).searchParams.get("id");
  let query = db.from("collaboration_requests").select("*, songs(title,slug), collaboration_invites(display_name)").order("submitted_at", { ascending: false });
  if (id) query = query.eq("id", id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load requests." }, { status: 500 });
  if (id && data?.[0]) {
    const { data: events } = await db.from("collaboration_request_events").select("*").eq("request_id", id).order("created_at", { ascending: true });
    const requestRow = data[0];
    const [draft, signed] = await Promise.all([
      requestRow.agreement_path ? db.storage.from(AGREEMENT_BUCKET).createSignedUrl(requestRow.agreement_path, 60 * 5) : Promise.resolve({ data: null }),
      requestRow.signed_agreement_path ? db.storage.from(AGREEMENT_BUCKET).createSignedUrl(requestRow.signed_agreement_path, 60 * 5) : Promise.resolve({ data: null }),
    ]);
    return NextResponse.json({ request: { ...requestRow, agreement_url: draft.data?.signedUrl || null, signed_agreement_url: signed.data?.signedUrl || null }, events: events || [] });
  }
  return NextResponse.json({ requests: data || [] });
}

export async function PATCH(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json(), id = String(body.id || ""), db = getSupabaseAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { data: current, error: currentError } = await db.from("collaboration_requests").select("status,agreement_status,agreement_path,signed_agreement_path,song_id,music_video_project_id,contribution_type,artist_name,email,profile_link,portfolio_url,estimated_rate").eq("id", id).maybeSingle();
  if (currentError || !current) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const allowed = ["new","reviewing","approved","declined","agreement_pending","signed","in_progress","completed","canceled","archived"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
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
    if (typeof signedPath !== "string" || !signedPath) return NextResponse.json({ error: "Upload the signed agreement before recording signature verification." }, { status: 409 });
    const folder = signedPath.slice(0, signedPath.lastIndexOf("/")), filename = signedPath.split("/").pop();
    const { data: files, error: storageError } = await db.storage.from(AGREEMENT_BUCKET).list(folder, { search: filename, limit: 50 });
    const exists = !storageError && !!files?.some((file) => file.name === filename);
    if (!canMarkAgreementSigned({ signedVerified: body.signedVerified, agreementPath: signedPath, verifiedDocumentExists: exists })) {
      return NextResponse.json({ error: "Review the uploaded signed PDF and confirm every required signature is present." }, { status: 409 });
    }
    update.agreement_status = "signed"; update.signed_at = new Date().toISOString();
  }
  if (typeof body.internal_notes === "string") update.internal_notes = body.internal_notes.slice(0, 10000);
  if (body.agreement && typeof body.agreement === "object" && !Array.isArray(body.agreement)) update.agreement_terms = body.agreement;
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
  if (typeof body.agreement_status === "string" && ["not_started","pending","sent","signed"].includes(body.agreement_status)) {
    if (body.agreement_status === "signed") return NextResponse.json({ error: "Mark the request Signed only after uploading and verifying the executed agreement." }, { status: 409 });
    if (body.agreement_status === "sent") {
      if (!current.agreement_path) return NextResponse.json({ error: "Upload the reviewed agreement PDF before marking it sent." }, { status: 409 });
      if (current.status !== "agreement_pending" && !canTransitionCollaborationStatus(current.status, "agreement_pending")) return NextResponse.json({ error: "Approve the request before sending an agreement." }, { status: 409 });
      update.agreement_sent_at = new Date().toISOString();
      if (!body.status) update.status = "agreement_pending";
    }
    update.agreement_status = body.agreement_status;
  }
  const { data, error } = await db.from("collaboration_requests").update(update).eq("id", id).select("id,status,agreement_status").single();
  if (error) return NextResponse.json({ error: "Unable to update request." }, { status: 500 });
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
  if (body.status || body.agreement_status || body.internal_notes || body.agreement || Object.keys(update).length > 1) {
    await db.from("collaboration_request_events").insert({ request_id: id, event: body.status === "signed" ? "signed" : body.status || body.agreement_status || "request_updated", details: { actor: auth.user.email, updates: Object.keys(update).filter((key) => key !== "updated_at") } });
  }
  return NextResponse.json({ request: data });
}
