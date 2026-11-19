import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const db = getSupabaseAdmin();
  const [songs, requests, videos] = await Promise.all([
    db.from("songs").select("id,title,slug,is_released,collaboration_enabled,created_at").order("title", { ascending: true }),
    db.from("collaboration_requests").select("id,song_id,status,submitted_at,contribution_type"),
    db.from("music_video_projects").select("id,song_id,status,visibility,next_action"),
  ]);
  if (songs.error) return NextResponse.json({ error: "Unable to load the song catalog." }, { status: 500 });
  // Projects are an additive feature and may not be migrated in this environment yet.
  const videoRows = videos.error ? [] : videos.data || [];
  const requestRows = requests.error ? [] : requests.data || [];
  return NextResponse.json({ songs: (songs.data || []).map(song => ({
    ...song,
    requests: requestRows.filter(row => row.song_id === song.id),
    musicVideo: videoRows.find(row => row.song_id === song.id) || null,
  })) });
}

export async function PATCH(request: Request) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json();
  if (typeof body.songId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.songId)) return NextResponse.json({ error: "Invalid song." }, { status: 400 });
  const update: Record<string, boolean> = {};
  if (typeof body.is_released === "boolean") update.is_released = body.is_released;
  if (typeof body.collaboration_enabled === "boolean") update.collaboration_enabled = body.collaboration_enabled;
  if (!Object.keys(update).length) return NextResponse.json({ error: "No supported changes provided." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("songs").update(update).eq("id", body.songId);
  if (error) return NextResponse.json({ error: "Unable to update this song." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
