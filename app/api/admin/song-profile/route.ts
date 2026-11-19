import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { songCoverPath } from "@/lib/songCover";

async function gate() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  return null;
}

export async function GET(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid song." }, { status: 400 });
  const db = getSupabaseAdmin();
  const songFields = "id,title,slug,is_released,created_at,spotify_url,apple_music_url,youtube_music_video_url,karaoke_url,sky_video_url,production_stages,production_tracking_started,audio_status,workflow_stage,ready_for_collab,collab_interests,collaboration_description,practice_notes,next_action,meaning,category,submit_hub,genre,sub_genre,sub_genre_2,lyrics,bpm,musical_key";
  let releaseDateAvailable = true;
  let songResult = await db.from("songs").select(`${songFields},release_date`).eq("id", id).maybeSingle();
  if (songResult.error && /release_date/i.test(songResult.error.message)) {
    releaseDateAvailable = false;
    songResult = await db.from("songs").select(songFields).eq("id", id).maybeSingle();
  }
  const { data: song, error } = songResult;
  if (error) return NextResponse.json({ error: "Unable to load this song workspace." }, { status: 503 });
  if (!song) return NextResponse.json({ error: "Song not found." }, { status: 404 });
  const [{ data: meanings }, { data: video }, { data: requests }] = await Promise.all([
    db.from("song_outreach_status").select("meaning_of_song,category").ilike("song", song.title).not("meaning_of_song", "eq", "").limit(10),
    db.from("music_video_projects").select("id,status,visibility,public_concept,workspace,next_action,assigned_videographer").eq("song_id", song.id).eq("project_type", "primary").maybeSingle(),
    db.from("collaboration_requests").select("id,status,submitted_at,contribution_type,artist_name,message").eq("song_id", song.id).order("submitted_at", { ascending: false }),
  ]);
  const meaning = song.meaning || (meanings || []).find(item => item.meaning_of_song?.trim())?.meaning_of_song || "";
  return NextResponse.json({ song: { ...song, release_date: song.release_date ?? null }, releaseDateAvailable, meaning, musicVideo: video || null, requests: requests || [], coverUrl: songCoverPath(song.slug, song.title), lyricUrl: `/api/lyrics/${encodeURIComponent(song.slug)}` });
}

export async function PATCH(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const body = await request.json();
  if (typeof body.songId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.songId) || (body.meaning !== undefined && typeof body.meaning !== "string") || (body.links !== undefined && (!body.links || typeof body.links !== "object"))) return NextResponse.json({ error: "A song profile update is required." }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: song } = await db.from("songs").select("id,title").eq("id", body.songId).single();
  if (!song) return NextResponse.json({ error: "Song not found." }, { status: 404 });
  const metadataKeys = ["meaning", "category", "submit_hub", "genre", "sub_genre", "sub_genre_2", "lyrics", "musical_key"] as const;
  const metadata: Record<string, string | number | null> = {};
  for (const key of metadataKeys) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== "string") return NextResponse.json({ error: `${key} must be text.` }, { status: 400 });
    metadata[key] = body[key].trim().slice(0, key === "lyrics" ? 50000 : 500);
  }
  if (body.bpm !== undefined) {
    if (body.bpm !== null && (!Number.isInteger(body.bpm) || body.bpm < 1 || body.bpm > 400)) return NextResponse.json({ error: "BPM must be between 1 and 400." }, { status: 400 });
    metadata.bpm = body.bpm;
  }
  if (Object.keys(metadata).length) {
    const { error } = await db.from("songs").update(metadata).eq("id", song.id);
    if (error) return NextResponse.json({ error: "Unable to save song details. Apply the song catalog metadata migration." }, { status: 503 });
  }
  if (typeof body.meaning === "string") {
    const { data: records, error: findError } = await db.from("song_outreach_status").select("id").ilike("song", song.title);
    if (findError) return NextResponse.json({ error: "Apply the song outreach migration before saving song meaning." }, { status: 503 });
    const meaning = body.meaning.trim().slice(0, 12000);
    if (records?.length) {
      const { error } = await db.from("song_outreach_status").update({ meaning_of_song: meaning, updated_at: new Date().toISOString() }).ilike("song", song.title);
      if (error) return NextResponse.json({ error: "Unable to save song meaning." }, { status: 500 });
    } else {
      const { error } = await db.from("song_outreach_status").insert({ song: song.title.toUpperCase(), category: "BLOGS & PRESS", meaning_of_song: meaning });
      if (error) return NextResponse.json({ error: "Unable to save song meaning." }, { status: 500 });
    }
  }
  if (body.links) {
    const allowed = ["spotify_url", "apple_music_url", "youtube_music_video_url", "karaoke_url", "sky_video_url"] as const;
    const links: Record<string, string | null> = {};
    for (const key of allowed) {
      if (!(key in body.links)) continue;
      const value = body.links[key];
      if (typeof value !== "string") return NextResponse.json({ error: "Song links must be text URLs." }, { status: 400 });
      const trimmed = value.trim();
      if (trimmed && !/^https:\/\//i.test(trimmed)) return NextResponse.json({ error: "Use a complete https:// link for each service." }, { status: 400 });
      links[key] = trimmed || null;
    }
    if (!Object.keys(links).length) return NextResponse.json({ error: "No song links were provided." }, { status: 400 });
    const { error } = await db.from("songs").update(links).eq("id", song.id);
    if (error) return NextResponse.json({ error: "Unable to save song links." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
