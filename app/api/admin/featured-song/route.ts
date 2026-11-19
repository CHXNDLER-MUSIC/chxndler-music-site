import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function authorizedUser() {
  const auth = await getApiUser();
  if (!auth) return { response: unauthorized() };
  if (!isAdminUser(auth.user)) return { response: forbidden() };
  return { user: auth.user };
}

function asMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {}
  }
  return {};
}

export async function GET() {
  const access = await authorizedUser();
  if (access.response) return access.response;
  const { data, error } = await getSupabaseAdmin().from("profiles").select("metadata").eq("id", access.user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load the featured song preference." }, { status: 500 });
  const value = asMetadata(data?.metadata).featured_song_id;
  return NextResponse.json({ songId: typeof value === "string" ? value : null });
}

export async function PATCH(request: Request) {
  const access = await authorizedUser();
  if (access.response) return access.response;
  let body: { songId?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Choose a song." }, { status: 400 }); }
  if (body.songId !== null && body.songId !== "" && (typeof body.songId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.songId))) {
    return NextResponse.json({ error: "Choose a valid song." }, { status: 400 });
  }
  const songId = typeof body.songId === "string" && body.songId ? body.songId : null;
  const db = getSupabaseAdmin();
  if (songId) {
    const { data: song, error } = await db.from("songs").select("id").eq("id", songId).maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to verify that song." }, { status: 500 });
    if (!song) return NextResponse.json({ error: "That song is no longer in the catalog." }, { status: 404 });
  }
  const { data: profile, error: readError } = await db.from("profiles").select("metadata").eq("id", access.user.id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Unable to load your profile preference." }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Your profile is not ready to save this preference." }, { status: 404 });
  const metadata = asMetadata(profile.metadata);
  if (songId) metadata.featured_song_id = songId;
  else delete metadata.featured_song_id;
  const { error } = await db.from("profiles").update({ metadata }).eq("id", access.user.id);
  if (error) return NextResponse.json({ error: "Unable to save your featured song." }, { status: 500 });
  return NextResponse.json({ songId });
}
