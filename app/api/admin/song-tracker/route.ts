import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { slugify } from "@/lib/slug";

export async function GET() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const db = getSupabaseAdmin();
  const [songResult, requests, videos] = await Promise.all([
    db.from("songs").select("id,title,slug,is_released,release_date,collaboration_enabled,production_stages,created_at,sky_video_url,youtube_music_video_url").order("title", { ascending: true }),
    db.from("collaboration_requests").select("id,song_id,status,submitted_at,contribution_type"),
    db.from("music_video_projects").select("id,song_id,status,visibility,next_action"),
  ]);
  let songs: any = songResult;
  // Keep the tracker readable while optional schema migrations are being applied.
  if (songs.error && /production_stages|column/i.test(songs.error.message)) {
    songs = await db.from("songs").select("id,title,slug,is_released,release_date,collaboration_enabled,created_at,sky_video_url,youtube_music_video_url").order("title", { ascending: true });
  }
  if (songs.error && /release_date|column/i.test(songs.error.message)) {
    songs = await db.from("songs").select("id,title,slug,is_released,collaboration_enabled,created_at,sky_video_url,youtube_music_video_url").order("title", { ascending: true });
  }
  if (songs.error) return NextResponse.json({ error: `Unable to load the song catalog: ${songs.error.message}` }, { status: 500 });
  // Projects are an additive feature and may not be migrated in this environment yet.
  const videoRows = videos.error ? [] : videos.data || [];
  const requestRows = requests.error ? [] : requests.data || [];
  return NextResponse.json({ songs: (songs.data || []).map(song => ({
    ...song,
    release_date: song.release_date ?? null,
    production_stages: song.production_stages || { concept: false, lyrics: false, recorded: false, mix: false, mastered: false, music_video: false },
    requests: requestRows.filter(row => row.song_id === song.id),
    musicVideo: videoRows.find(row => row.song_id === song.id) || null,
  })) });
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
  if (typeof body.songId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.songId)) return NextResponse.json({ error: "Invalid song." }, { status: 400 });
  const update: Record<string, any> = {};
  if (typeof body.is_released === "boolean") update.is_released = body.is_released;
  if (typeof body.collaboration_enabled === "boolean") update.collaboration_enabled = body.collaboration_enabled;
  if (body.release_date === null || (typeof body.release_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.release_date))) update.release_date = body.release_date;
  const stageKeys = ["concept", "lyrics", "recorded", "mix", "mastered", "music_video"] as const;
  if (body.stage !== undefined) {
    if (!stageKeys.includes(body.stage) || typeof body.complete !== "boolean") return NextResponse.json({ error: "Invalid production stage." }, { status: 400 });
    const db = getSupabaseAdmin();
    const { data: song, error: readError } = await db.from("songs").select("production_stages").eq("id", body.songId).single();
    if (readError || !song) return NextResponse.json({ error: "Production stages are unavailable. Apply the song production stages migration." }, { status: 503 });
    update.production_stages = { ...(song.production_stages || {}), [body.stage]: body.complete };
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: "No supported changes provided." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("songs").update(update).eq("id", body.songId);
  if (error) return NextResponse.json({ error: "Unable to update this song." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
