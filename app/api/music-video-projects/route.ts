import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
const statuses = ["concept", "planning", "agreement", "filming", "editing", "delivered", "complete"];
const visibilities = ["public", "invite_only", "hidden"];
const collaborationStages = ["Seeking", "Discussing", "Confirmed", "Production", "Delivered"];

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const auth = await getApiUser();
    if (!auth) return unauthorized();
    if (!isAdminUser(auth.user)) return forbidden();
    const { data, error } = await getSupabaseAdmin().from("music_video_projects").select("*, songs(id,title,slug)").eq("id", id).single();
    if (error) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ project: data });
  }
  const { data, error } = await getSupabaseAdmin().from("music_video_projects")
    .select("id,song_id,visibility,status,public_concept,public_status,next_action,assigned_videographer,updated_at,songs(title,slug)")
    .eq("visibility", "public").order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load public projects." }, { status: 500 });
  return NextResponse.json({ projects: data || [] });
}

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json(), db = getSupabaseAdmin();
  const songId = String(body.songId || "");
  if (!songId) return NextResponse.json({ error: "Select a song." }, { status: 400 });
  const { data, error } = await db.from("music_video_projects").upsert({ song_id: songId, project_type: "primary" }, { onConflict: "song_id,project_type", ignoreDuplicates: true }).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not create project. Confirm the migration is applied and the song exists." }, { status: 500 });
  if (data) return NextResponse.json({ id: data.id });
  const existing = await db.from("music_video_projects").select("id").eq("song_id", songId).eq("project_type", "primary").single();
  return NextResponse.json({ id: existing.data?.id });
}

export async function PATCH(request: Request) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json(), id = String(body.id || ""), update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.visibility === "string" && visibilities.includes(body.visibility)) update.visibility = body.visibility;
  if (typeof body.status === "string" && statuses.includes(body.status)) update.status = body.status;
  if (typeof body.collaboration_stage === "string" && collaborationStages.includes(body.collaboration_stage)) update.collaboration_stage = body.collaboration_stage;
  if (typeof body.public_concept === "string") update.public_concept = body.public_concept.slice(0, 1000);
  if (typeof body.public_status === "string") update.public_status = body.public_status.slice(0, 80);
  if (typeof body.next_action === "string") update.next_action = body.next_action.slice(0, 240);
  if (body.workspace && typeof body.workspace === "object") update.workspace = body.workspace;
  if (body.assigned_videographer && typeof body.assigned_videographer === "object") update.assigned_videographer = body.assigned_videographer;
  const { data, error } = await getSupabaseAdmin().from("music_video_projects").update(update).eq("id", id).select("id,updated_at").single();
  if (error) return NextResponse.json({ error: "Unable to save project." }, { status: 500 });
  return NextResponse.json({ project: data });
}
