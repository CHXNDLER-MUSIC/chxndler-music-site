import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const categories = ["BLOGS & PRESS", "INFLUENCER", "PLAYLIST", "RADIO", "SYNC"] as const;

export async function GET() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const { data, error } = await getSupabaseAdmin().from("song_outreach_status")
    .select("id,song,category,pitch,complete,meaning_of_song,updated_at")
    .order("song").order("category");
  if (error) return NextResponse.json({ error: "Unable to load song outreach. Apply the outreach database migration first." }, { status: 500 });
  return NextResponse.json({ records: data || [] });
}

export async function PATCH(request: Request) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json();
  if (typeof body.song !== "string" || !body.song.trim() || !categories.includes(body.category)) {
    return NextResponse.json({ error: "A song and valid category are required." }, { status: 400 });
  }
  const update = {
    song: body.song.trim(), category: body.category,
    pitch: typeof body.pitch === "string" ? body.pitch : "",
    complete: body.complete === true,
    meaning_of_song: typeof body.meaning_of_song === "string" ? body.meaning_of_song : "",
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await getSupabaseAdmin().from("song_outreach_status")
    .upsert(update, { onConflict: "song,category" }).select("id,song,category,pitch,complete,meaning_of_song,updated_at").single();
  if (error) return NextResponse.json({ error: "Unable to save this outreach status." }, { status: 500 });
  return NextResponse.json({ record: data });
}
