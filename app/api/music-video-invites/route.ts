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
    const { data, error } = await db.from("music_video_invites").insert({ project_id: projectId, recipient_email: email, token_hash: tokenHash }).select("id").single();
    if (error) return NextResponse.json({ error: "Could not create private invite. Confirm the videographer invite migration is applied." }, { status: 500 });
    invites.push({ id: String(data?.id || ""), email, link: `${base}/video-invite/${token}` });
  }
  return NextResponse.json({ invites });
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
  const { data: invite } = await db.from("music_video_invites").select("id,recipient_email,project_id").eq("token_hash", hash).is("revoked_at", null).maybeSingle();
  if (!invite) return NextResponse.json({ error: "This invite is invalid or has been revoked." }, { status: 404 });
  const { data: project } = await db.from("music_video_projects").select("id,status,public_concept,workspace,songs(title,slug)").eq("id", invite.project_id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json({ project, recipientEmail: invite.recipient_email });
}
