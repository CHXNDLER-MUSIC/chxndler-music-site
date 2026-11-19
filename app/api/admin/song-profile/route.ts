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
  const { data: song, error } = await db.from("songs").select("id,title,slug,is_released,created_at,spotify_url,apple_music_url,youtube_music_video_url,karaoke_url,sky_video_url").eq("id", id).single();
  if (error || !song) return NextResponse.json({ error: "Song not found." }, { status: 404 });
  const [{ data: meanings }, { data: video }] = await Promise.all([
    db.from("song_outreach_status").select("meaning_of_song,category").ilike("song", song.title).not("meaning_of_song", "eq", "").limit(10),
    db.from("music_video_projects").select("id,status,visibility,public_concept,workspace,next_action,assigned_videographer").eq("song_id", song.id).eq("project_type", "primary").maybeSingle(),
  ]);
  const meaning = (meanings || []).find(item => item.meaning_of_song?.trim())?.meaning_of_song || "";
  return NextResponse.json({ song, meaning, musicVideo: video || null, coverUrl: songCoverPath(song.slug, song.title), lyricUrl: `/api/lyrics/${encodeURIComponent(song.slug)}` });
}

export async function PATCH(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const body = await request.json();
  if (typeof body.songId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.songId) || typeof body.meaning !== "string") return NextResponse.json({ error: "A song and meaning are required." }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: song } = await db.from("songs").select("id,title").eq("id", body.songId).single();
  if (!song) return NextResponse.json({ error: "Song not found." }, { status: 404 });
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
  return NextResponse.json({ ok: true, meaning });
}
