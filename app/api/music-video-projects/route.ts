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
    .select("id,song_id,public_concept,public_status,songs(title,slug)")
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
  const existing = data ? null : await db.from("music_video_projects").select("id,song_id").eq("song_id", songId).eq("project_type", "primary").single();
  const project = data ? { id: data.id, song_id: songId } : existing?.data;
  if (!project?.id) return NextResponse.json({ error: "Project could not be loaded." }, { status: 500 });
  const { data: linked, error: linkReadError } = await db.from("content_items").select("id").eq("music_video_project_id", project.id).maybeSingle();
  if (linkReadError) return NextResponse.json({ error: "Project created, but the linked Content entry could not be checked. Apply the content workspace migration." }, { status: 503 });
  if (!linked) {
  const { data: song } = await db.from("songs").select("title").eq("id", songId).single();
    const songTitle = song?.title || null;
    const { error: linkError } = await db.from("content_items").insert({ title: `${songTitle || "Song"} — Official Music Video`, category: "MUSIC VIDEO", sub_category: "OFFICIAL VIDEO", song_name: songTitle, song_id: project.song_id, recorded: false, edited: false, post_ready: false, media_type: "VIDEO", purpose: "Official music video production", music_video_project_id: project.id, is_reportable: false });
    if (linkError && linkError.code !== "23505") return NextResponse.json({ error: "Project created, but its linked Content entry could not be saved." }, { status: 500 });
  }
  return NextResponse.json({ id: project.id });
}

export async function PATCH(request: Request) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json(), id = String(body.id || ""), update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Choose a valid project." }, { status: 400 });
  const { data: current, error: currentError } = await getSupabaseAdmin().from("music_video_projects").select("workspace").eq("id", id).maybeSingle();
  if (currentError || !current) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (typeof body.visibility === "string" && visibilities.includes(body.visibility)) update.visibility = body.visibility;
  if (typeof body.status === "string" && statuses.includes(body.status)) update.status = body.status;
  if (typeof body.collaboration_stage === "string" && collaborationStages.includes(body.collaboration_stage)) update.collaboration_stage = body.collaboration_stage;
  if (typeof body.public_concept === "string") update.public_concept = body.public_concept.slice(0, 1000);
  if (typeof body.public_status === "string") update.public_status = body.public_status.slice(0, 80);
  if (typeof body.next_action === "string") update.next_action = body.next_action.slice(0, 240);
  if (body.workspace && typeof body.workspace === "object" && !Array.isArray(body.workspace)) {
    const encoded = JSON.stringify(body.workspace);
    if (encoded.length > 400_000) return NextResponse.json({ error: "Project notes are too large. Use cloud links for large files." }, { status: 413 });
    const previousAgreement = current.workspace?.collaboration?.agreement;
    const nextAgreement = body.workspace?.collaboration?.agreement;
    if (previousAgreement?.signedSnapshot && JSON.stringify(previousAgreement.signedSnapshot) !== JSON.stringify(nextAgreement?.signedSnapshot)) {
      return NextResponse.json({ error: "The signed agreement is locked. Record a proposed amendment instead." }, { status: 409 });
    }
    update.workspace = body.workspace;
  }
  if (body.assigned_videographer && typeof body.assigned_videographer === "object" && !Array.isArray(body.assigned_videographer)) update.assigned_videographer = body.assigned_videographer;
  const { data, error } = await getSupabaseAdmin().from("music_video_projects").update(update).eq("id", id).select("id,updated_at").single();
  if (error) return NextResponse.json({ error: "Unable to save project." }, { status: 500 });
  return NextResponse.json({ project: data });
}
