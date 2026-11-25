import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { agreementTemplates } from "@/lib/collaborationAgreements";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json(), projectId = String(body.projectId || "");
  const recipientName = typeof body.recipientName === "string" ? body.recipientName.trim().replace(/\s+/g, " ").slice(0, 120) : "";
  const emails: string[] = Array.isArray(body.emails) ? [...new Set<string>(body.emails.map((value: unknown) => String(value).trim().toLowerCase()).filter((value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))].slice(0, 5) : [];
  if (!/^[0-9a-f-]{36}$/i.test(projectId) || !emails.length || !recipientName) return NextResponse.json({ error: "Enter the project, videographer name, and at least one valid email." }, { status: 400 });
  const db = getSupabaseAdmin(), invites: Array<{ id: string; email: string; name: string; link: string; agreementStatus: string }> = [];
  let base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(new URL(base).hostname)) base = "https://chxndler.world";
  base = base.replace(/\/+$/, "");
  const { data: project } = await db.from("music_video_projects").select("workspace,songs(title)").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Music video project not found." }, { status: 404 });
  const projectWorkspace = project.workspace || {}, creative = projectWorkspace.creative || {};
  const concepts = Array.isArray(creative.concepts) ? creative.concepts : [];
  const selectedConcept = concepts.find((item: Record<string, unknown>) => item.id === creative.selectedConceptId) || concepts[0] || null;
  const songRelation = Array.isArray(project.songs) ? project.songs[0] : project.songs;
  const template = agreementTemplates.videographer;
  const agreementTerms = {
    ...template.defaults,
    collaborator_legal_name: recipientName,
    collaborator_artist_name: recipientName,
    song_title: songRelation?.title || "CHXNDLER music video",
    production_scope: selectedConcept?.conceptStatement || selectedConcept?.synopsis || selectedConcept?.story || "Develop and produce the agreed visual concept for this music video.",
    video_deliverables: template.defaults.video_deliverables,
    short_form_edits: template.defaults.short_form_edits,
    revision_rounds: template.defaults.revision_rounds,
    credits: `Video by ${recipientName}`,
    template_id: template.id,
    template_version: template.version,
    legal_terms: template.legalTerms,
  };
  for (const email of emails) {
    const token = randomBytes(32).toString("base64url"), tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await db.from("music_video_invites").insert({ project_id: projectId, recipient_email: email, recipient_name: recipientName, agreement_terms: agreementTerms, agreement_status: "pending", token_hash: tokenHash, expires_at: expiresAt }).select("id").single();
    if (error) return NextResponse.json({ error: "Could not create private invite. Confirm the videographer invite migration is applied." }, { status: 500 });
    invites.push({ id: String(data?.id || ""), email, name: recipientName, link: `${base}/video-invite/${token}`, agreementStatus: "pending" });
  }
  let emailStatus: "sent" | "not_configured" | "failed" = "not_configured";
  const songTitle = songRelation?.title || "CHXNDLER";
  const host = process.env.SMTP_HOST, from = process.env.SMTP_FROM, user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (host && from && user && pass) {
    try {
      const nodemailer = await import("nodemailer"), port = Number(process.env.SMTP_PORT || 587);
      const transport = nodemailer.default.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
      await Promise.all(invites.map(invite => transport.sendMail({
        from, to: invite.email, replyTo: process.env.COLLAB_REPLY_TO || from,
        subject: `Music video collaboration · ${songTitle}`,
        text: `You have been invited to review the ${songTitle} music video project and videographer agreement. Open your private project and contract link: ${invite.link}\n\nThis link expires in 30 days and can be revoked by the project owner.`,
        html: `<p>You have been invited to review the <strong>${String(songTitle).replace(/[&<>"']/g, "")}</strong> music video project and videographer agreement.</p><p><a href="${invite.link}">Review project and agreement</a></p><p>This link expires in 30 days and can be revoked by the project owner.</p>`,
      })));
      emailStatus = "sent";
    } catch (error) { console.error("[music-video] invite email failed", error); emailStatus = "failed"; }
  }
  return NextResponse.json({ invites, emailStatus });
}

export async function DELETE(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const { id } = await request.json();
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid invite." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("music_video_invites").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not revoke invite." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const url = new URL(request.url), projectId = url.searchParams.get("projectId");
  if (projectId) {
    const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) return NextResponse.json({ error: "Invalid project." }, { status: 400 });
    const { data, error } = await getSupabaseAdmin().from("music_video_invites").select("id,recipient_email,recipient_name,expires_at,agreement_status,agreement_signer_name,agreement_signed_at").eq("project_id", projectId).is("revoked_at", null).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Unable to load project invites." }, { status: 500 });
    return NextResponse.json({ invites: (data || []).filter(row => !row.expires_at || new Date(row.expires_at).getTime() >= Date.now()).map(row => ({ id: row.id, email: row.recipient_email, name: row.recipient_name, expiresAt: row.expires_at, agreementStatus: row.agreement_status, signerName: row.agreement_signer_name, signedAt: row.agreement_signed_at })) });
  }
  const token = url.searchParams.get("token") || "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  const hash = createHash("sha256").update(token).digest("hex"), db = getSupabaseAdmin();
  const { data: invite } = await db.from("music_video_invites").select("id,recipient_email,recipient_name,project_id,expires_at,agreement_terms,agreement_status,agreement_signer_name,agreement_signed_at,agreement_acceptance_text").eq("token_hash", hash).is("revoked_at", null).maybeSingle();
  if (!invite) return NextResponse.json({ error: "This invite is invalid or has been revoked." }, { status: 404 });
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
  const { data: project } = await db.from("music_video_projects").select("id,status,public_concept,workspace,songs(title,slug)").eq("id", invite.project_id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const workspace = project.workspace || {};
  const creative = workspace.creative || {}, concepts = Array.isArray(creative.concepts) ? creative.concepts : [];
  const selectedConcept = concepts.find((item: Record<string, unknown>) => item.id === creative.selectedConceptId) || concepts[0] || null;
  const people = workspace.people || {};
  const safeCreative = {
    concept: selectedConcept ? { title: selectedConcept.title || "", story: selectedConcept.story || selectedConcept.synopsis || "", theme: selectedConcept.theme || selectedConcept.conceptStatement || "", aesthetic: selectedConcept.aesthetic || "", styles: selectedConcept.styles || [], moods: selectedConcept.moods || [], references: selectedConcept.references || "" } : {
      title: creative.overallConcept || "", story: creative.story || "", theme: creative.themes || "", aesthetic: creative.aesthetic || "", references: creative.visualReferences || "",
    },
    characters: (Array.isArray(people.actors) ? people.actors : []).filter((row: Record<string, unknown>) => !row.archived).map((row: Record<string, unknown>) => ({ name: row.name, role: row.role, status: row.status })),
    locations: (Array.isArray(people.locations) ? people.locations : []).filter((row: Record<string, unknown>) => !row.archived).map((row: Record<string, unknown>) => ({ name: row.name, address: row.address, url: row.url, status: row.status })),
    wardrobe: (Array.isArray(people.outfits) ? people.outfits : []).filter((row: Record<string, unknown>) => !row.archived).map((row: Record<string, unknown>) => ({ name: row.name, notes: row.notes })),
    props: (Array.isArray(people.props) ? people.props : []).filter((row: Record<string, unknown>) => !row.archived).map((row: Record<string, unknown>) => ({ name: row.name, notes: row.notes })),
    scenes: (Array.isArray(selectedConcept?.scenes) ? selectedConcept.scenes : Array.isArray(creative.scenes) ? creative.scenes : []).map((scene: Record<string, unknown>) => ({ number: scene.number, title: scene.title, description: scene.description, location: scene.location, characters: scene.characters, outfits: scene.outfits, props: scene.props })),
    shots: Array.isArray(creative.shotList) ? creative.shotList : [],
  };
  return NextResponse.json({ project: { id: project.id, status: project.status, public_concept: project.public_concept, songs: project.songs, workspace: { creative: safeCreative, production: { deliverables: (Array.isArray(workspace.production?.deliverables) ? workspace.production.deliverables : []).map((item: Record<string, unknown>) => ({ title: item.title, description: item.description, format: item.format, dueDate: item.dueDate, status: item.status })), shootDate: workspace.production?.shootDate || "", shootSchedule: (Array.isArray(workspace.production?.shootSchedule) ? workspace.production.shootSchedule : []).map((item: Record<string, unknown>) => ({ title: item.title, startTime: item.startTime, endTime: item.endTime, location: item.location, scenes: item.scenes, notes: item.notes })), requirements: workspace.production?.requirements || [] }, collaboration: { proposal: workspace.collaboration?.proposal || {}, discussion: workspace.collaboration?.discussion || [] } } }, recipientEmail: invite.recipient_email, recipientName: invite.recipient_name, agreement: { status: invite.agreement_status || "pending", terms: invite.agreement_terms || {}, signerName: invite.agreement_signer_name || "", signedAt: invite.agreement_signed_at || "", acceptanceText: invite.agreement_acceptance_text || "" } });
}

export async function PATCH(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  const hash = createHash("sha256").update(token).digest("hex"), db = getSupabaseAdmin();
  const { data: invite } = await db.from("music_video_invites").select("id,project_id,expires_at,agreement_status,recipient_name,agreement_terms").eq("token_hash", hash).is("revoked_at", null).maybeSingle();
  if (!invite || (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now())) return NextResponse.json({ error: "This invite is invalid, revoked, or expired." }, { status: 404 });
  const body = await request.json(), action = String(body.action || "");
  if (action === "sign") {
    if (invite.agreement_status === "signed") return NextResponse.json({ error: "This agreement has already been signed." }, { status: 409 });
    const signerName = typeof body.signerName === "string" ? body.signerName.trim().replace(/\s+/g, " ").slice(0, 120) : "";
    if (!signerName || body.accepted !== true) return NextResponse.json({ error: "Enter your full name and confirm that you agree to the videographer contract." }, { status: 400 });
    const acceptanceText = `I, ${signerName}, have reviewed and agree to the videographer agreement for ${String(invite.agreement_terms?.song_title || "this music video").slice(0, 180)}.`;
    const { error } = await db.from("music_video_invites").update({ agreement_status: "signed", agreement_signer_name: signerName, agreement_signed_at: new Date().toISOString(), agreement_acceptance_text: acceptanceText }).eq("id", invite.id).eq("agreement_status", "pending");
    if (error) return NextResponse.json({ error: "Unable to record agreement acceptance." }, { status: 500 });
    return NextResponse.json({ ok: true, signerName, acceptanceText });
  }
  const { data: project } = await db.from("music_video_projects").select("id,workspace").eq("id", invite.project_id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const workspace = project.workspace || {}, collaboration = workspace.collaboration || {}, production = workspace.production || {};
  if (action === "comment") {
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 3000) : "";
    if (!text) return NextResponse.json({ error: "Write a comment first." }, { status: 400 });
    collaboration.discussion = [...(Array.isArray(collaboration.discussion) ? collaboration.discussion : []), { author: "Videographer", text, createdAt: new Date().toISOString() }].slice(-200);
  } else if (action === "proposal") {
    if (!body.proposal || typeof body.proposal !== "object" || Array.isArray(body.proposal)) return NextResponse.json({ error: "Enter a proposal." }, { status: 400 });
    collaboration.proposal = { ...body.proposal, submittedAt: new Date().toISOString(), status: "proposed" };
  } else if (action === "deliverable") {
    const index = Number(body.index), link = typeof body.deliveryLink === "string" ? body.deliveryLink.trim().slice(0, 2000) : "";
    if (!Number.isInteger(index) || index < 0 || !link || !/^https:\/\//i.test(link)) return NextResponse.json({ error: "Enter a valid HTTPS delivery link." }, { status: 400 });
    const deliverables = Array.isArray(production.deliverables) ? [...production.deliverables] : [];
    if (!deliverables[index]) return NextResponse.json({ error: "Deliverable not found." }, { status: 404 });
    deliverables[index] = { ...deliverables[index], deliveryLink: link, status: "submitted", submittedAt: new Date().toISOString() };
    production.deliverables = deliverables;
  } else return NextResponse.json({ error: "Unsupported project update." }, { status: 400 });
  workspace.collaboration = collaboration;
  if (action === "deliverable") workspace.production = production;
  const { error } = await db.from("music_video_projects").update({ workspace, updated_at: new Date().toISOString() }).eq("id", invite.project_id);
  if (error) return NextResponse.json({ error: "Unable to save project update." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
