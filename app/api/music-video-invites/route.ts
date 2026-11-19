import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json(), projectId = String(body.projectId || "");
  const emails: string[] = Array.isArray(body.emails) ? [...new Set<string>(body.emails.map((value: unknown) => String(value).trim().toLowerCase()).filter((value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))].slice(0, 5) : [];
  if (!/^[0-9a-f-]{36}$/i.test(projectId) || !emails.length) return NextResponse.json({ error: "Enter a project and at least one valid videographer email." }, { status: 400 });
  const db = getSupabaseAdmin(), invites: Array<{ id: string; email: string; link: string }> = [], base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  for (const email of emails) {
    const token = randomBytes(32).toString("base64url"), tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await db.from("music_video_invites").insert({ project_id: projectId, recipient_email: email, token_hash: tokenHash, expires_at: expiresAt }).select("id").single();
    if (error) return NextResponse.json({ error: "Could not create private invite. Confirm the videographer invite migration is applied." }, { status: 500 });
    invites.push({ id: String(data?.id || ""), email, link: `${base}/video-invite/${token}` });
  }
  let emailStatus: "sent" | "not_configured" | "failed" = "not_configured";
  const { data: project } = await db.from("music_video_projects").select("songs(title)").eq("id", projectId).maybeSingle();
  const host = process.env.SMTP_HOST, from = process.env.SMTP_FROM, user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (host && from && user && pass) {
    try {
      const nodemailer = await import("nodemailer"), port = Number(process.env.SMTP_PORT || 587);
      const transport = nodemailer.default.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
      await Promise.all(invites.map(invite => transport.sendMail({
        from, to: invite.email, replyTo: process.env.COLLAB_REPLY_TO || from,
        subject: `Music video collaboration · ${project?.songs?.title || "CHXNDLER"}`,
        text: `You have been invited to collaborate on the ${project?.songs?.title || "CHXNDLER"} music video. Open your private project workspace: ${invite.link}\n\nThis link expires in 30 days and can be revoked by the project owner.`,
        html: `<p>You have been invited to collaborate on the <strong>${String(project?.songs?.title || "CHXNDLER").replace(/[&<>"']/g, "")}</strong> music video.</p><p><a href="${invite.link}">Open your private project workspace</a></p><p>This link expires in 30 days and can be revoked by the project owner.</p>`,
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
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  const hash = createHash("sha256").update(token).digest("hex"), db = getSupabaseAdmin();
  const { data: invite } = await db.from("music_video_invites").select("id,recipient_email,project_id,expires_at").eq("token_hash", hash).is("revoked_at", null).maybeSingle();
  if (!invite) return NextResponse.json({ error: "This invite is invalid or has been revoked." }, { status: 404 });
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
  const { data: project } = await db.from("music_video_projects").select("id,status,public_concept,workspace,songs(title,slug)").eq("id", invite.project_id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const workspace = project.workspace || {};
  return NextResponse.json({ project: { id: project.id, status: project.status, public_concept: project.public_concept, songs: project.songs, workspace: { creative: workspace.creative || {}, production: { deliverables: (workspace.production?.deliverables || []).map((item: Record<string, unknown>) => ({ title: item.title, description: item.description, format: item.format, dueDate: item.dueDate, status: item.status, deliveryLink: item.deliveryLink, revisionFeedback: item.revisionFeedback })), shootDate: workspace.production?.shootDate || "", requirements: workspace.production?.requirements || [] }, collaboration: { proposal: workspace.collaboration?.proposal || {}, discussion: workspace.collaboration?.discussion || [] } } }, recipientEmail: invite.recipient_email });
}

export async function PATCH(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  const hash = createHash("sha256").update(token).digest("hex"), db = getSupabaseAdmin();
  const { data: invite } = await db.from("music_video_invites").select("id,project_id,expires_at").eq("token_hash", hash).is("revoked_at", null).maybeSingle();
  if (!invite || (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now())) return NextResponse.json({ error: "This invite is invalid, revoked, or expired." }, { status: 404 });
  const body = await request.json(), action = String(body.action || "");
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
