import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { slugify } from "@/lib/slug";

export async function GET() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const db = getSupabaseAdmin();
  const [songResult, requests, videos, tasks] = await Promise.all([
    db.from("songs").select("id,title,slug,is_released,release_date,audio_status,collaboration_opportunities,video_concept,collaboration_enabled,production_stages,production_tracking_started,ready_for_collab,collab_interests,collaboration_description,workflow_stage,next_action,next_action_manual,created_at,sky_video_url,youtube_music_video_url,spotify_url,karaoke_url,practice_notes").order("title", { ascending: true }),
    db.from("collaboration_requests").select("id,song_id,status,submitted_at,contribution_type"),
    db.from("music_video_projects").select("id,song_id,status,visibility,next_action,assigned_videographer,public_concept"),
    db.from("admin_tasks").select("song_id,title,status,priority,due_at,created_at").neq("status", "done").not("song_id", "is", null).order("due_at", { ascending: true, nullsFirst: false }),
  ]);
  let songs: any = songResult;
  // Keep the tracker readable while optional schema migrations are being applied.
  if (songs.error && /production_stages|ready_for_collab|column/i.test(songs.error.message)) {
    songs = await db.from("songs").select("id,title,slug,is_released,release_date,collaboration_enabled,created_at,sky_video_url,youtube_music_video_url").order("title", { ascending: true });
  }
  if (songs.error && /release_date|column/i.test(songs.error.message)) {
    songs = await db.from("songs").select("id,title,slug,is_released,collaboration_enabled,created_at,sky_video_url,youtube_music_video_url").order("title", { ascending: true });
  }
  if (songs.error) return NextResponse.json({ error: `Unable to load the song catalog: ${songs.error.message}` }, { status: 500 });
  // Projects are an additive feature and may not be migrated in this environment yet.
  const videoRows = videos.error ? [] : videos.data || [];
  const requestRows = requests.error ? [] : requests.data || [];
  const taskRows = tasks.error ? [] : tasks.data || [];
  return NextResponse.json({ songs: (songs.data || []).map(song => {
    const musicVideo = videoRows.find(row => row.song_id === song.id) || null;
    const hasMusicVideo = !!musicVideo || !!song.youtube_music_video_url || !!song.sky_video_url;
    const isReleased = song.is_released || song.audio_status === "Released";
    const productionStages = { ...(song.production_stages || {}), ...(hasMusicVideo ? { music_video: true } : {}) };
    const opportunities = isReleased ? ["remix"] : [...new Set(["remix", ...(song.collaboration_opportunities || []).filter((value: string) => value === "feature"), ...(!hasMusicVideo ? ["video"] : [])])];
    return ({
    ...song,
    release_date: song.release_date ?? null,
    production_stages: productionStages,
    production_tracking_started: song.production_tracking_started === true || Object.values(productionStages).some(value => value === true),
    ready_for_collab: song.ready_for_collab === true,
    collab_interests: Array.isArray(song.collab_interests) ? song.collab_interests : [],
    collaboration_description: song.collaboration_description || "",
    workflow_stage: song.workflow_stage || "Idea",
    next_action: song.next_action || "",
    next_action_manual: song.next_action_manual === true,
    derived_next_action: song.next_action_manual ? "" : taskRows.find(task => task.song_id === song.id)?.title || "",
    collaboration_opportunities: opportunities,
    requests: requestRows.filter(row => row.song_id === song.id),
    musicVideo,
  }); }) });
}

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) return NextResponse.json({ error: "Enter a song title." }, { status: 400 });
  const db = getSupabaseAdmin();
  const baseSlug = slugify(title);
  let slug = baseSlug;
  for (let suffix = 2; ; suffix += 1) {
    const { data: existing, error } = await db.from("songs").select("id").eq("slug", slug).maybeSingle();
    if (error) return NextResponse.json({ error: `Unable to check the song catalog: ${error.message}` }, { status: 500 });
    if (!existing) break;
    slug = `${baseSlug}-${suffix}`;
  }
  const { data: song, error } = await db.from("songs").insert({ title, slug, is_released: false, collaboration_enabled: false }).select("id,title,slug,is_released,collaboration_enabled,created_at,sky_video_url,youtube_music_video_url").single();
  if (error || !song) return NextResponse.json({ error: `Unable to add this song: ${error?.message || "No song was returned."}` }, { status: 500 });
  // Link the new song into the existing task workflow when that optional table is installed.
  await db.from("admin_tasks").upsert({ business_area: "unreleased_song", song_id: song.id, title: "Complete song profile", description: "Develop this song’s profile, meaning, lyrics, collaboration, and music video." }, { onConflict: "song_id,title", ignoreDuplicates: true });
  return NextResponse.json({ song }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json();
  const db = getSupabaseAdmin();
  if (Array.isArray(body.songIds) && typeof body.ready_for_collab === "boolean") {
    const ids = [...new Set(body.songIds.filter((id: unknown) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 100);
    if (!ids.length) return NextResponse.json({ error: "Select at least one song." }, { status: 400 });
    const { error } = await db.from("songs").update({ ready_for_collab: body.ready_for_collab }).in("id", ids);
    if (error) return NextResponse.json({ error: "Apply the music workspace migration before changing Ready for Collab." }, { status: 503 });
    return NextResponse.json({ ok: true, updated: ids.length });
  }
  if (typeof body.songId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.songId)) return NextResponse.json({ error: "Invalid song." }, { status: 400 });
  const update: Record<string, any> = {};
  if (typeof body.is_released === "boolean") { update.is_released = body.is_released; if (body.is_released) update.collaboration_opportunities = ["remix"]; }
  if (typeof body.collaboration_enabled === "boolean") update.collaboration_enabled = body.collaboration_enabled;
  if (["Demo", "In Progress", "Final", "Released"].includes(body.audio_status)) { update.audio_status = body.audio_status; if (body.audio_status === "Released") update.collaboration_opportunities = ["remix"]; }
  if (Array.isArray(body.collaboration_opportunities) && body.collaboration_opportunities.every((value: unknown) => ["feature", "video", "remix"].includes(String(value)))) update.collaboration_opportunities = [...new Set(["remix", ...body.collaboration_opportunities.filter((value: string) => value !== "video")])];
  if (typeof body.video_concept === "string") update.video_concept = body.video_concept.trim().slice(0, 500);
  if (typeof body.ready_for_collab === "boolean") update.ready_for_collab = body.ready_for_collab;
  if (Array.isArray(body.collab_interests) && body.collab_interests.every((value: unknown) => typeof value === "string")) {
    const allowed = new Set(["Feature / Vocals", "Remix", "Music Video", "Other"]);
    update.collab_interests = [...new Set(body.collab_interests.filter((value: string) => allowed.has(value)))];
  }
  if (typeof body.collaboration_description === "string") update.collaboration_description = body.collaboration_description.trim().slice(0, 500);
  if (["Idea", "Writing", "Recording", "Mixing", "Mastering", "Ready"].includes(body.workflow_stage)) update.workflow_stage = body.workflow_stage;
  if (typeof body.next_action === "string") { update.next_action = body.next_action.trim().slice(0, 240); update.next_action_manual = true; }
  if (body.release_date === null || (typeof body.release_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.release_date))) update.release_date = body.release_date;
  const stageKeys = ["concept", "lyrics", "recorded", "mix", "mastered", "ready", "music_video", "playlist_pitch", "sync_placement"] as const;
  if (body.stage !== undefined) {
    if (!stageKeys.includes(body.stage) || typeof body.complete !== "boolean") return NextResponse.json({ error: "Invalid production stage." }, { status: 400 });
    const { data: song, error: readError } = await db.from("songs").select("production_stages").eq("id", body.songId).single();
    if (readError || !song) return NextResponse.json({ error: "Production stages are unavailable. Apply the song production stages migration." }, { status: 503 });
    update.production_stages = { ...(song.production_stages || {}), [body.stage]: body.complete };
    update.production_tracking_started = true;
  }
  if (Array.isArray(update.collaboration_opportunities)) {
    const { data: currentSong } = await db.from("songs").select("is_released,audio_status").eq("id", body.songId).maybeSingle();
    if (body.is_released === true || body.audio_status === "Released" || currentSong?.is_released || currentSong?.audio_status === "Released") update.collaboration_opportunities = ["remix"];
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: "No supported changes provided." }, { status: 400 });
  const { error } = await db.from("songs").update(update).eq("id", body.songId);
  if (error) return NextResponse.json({ error: /ready_for_collab|workflow_stage|column/i.test(error.message) ? "Apply the music workspace migration before saving these fields." : "Unable to update this song." }, { status: /ready_for_collab|workflow_stage|column/i.test(error.message) ? 503 : 500 });
  return NextResponse.json({ ok: true });
}
