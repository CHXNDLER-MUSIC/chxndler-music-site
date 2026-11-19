import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const { data, error } = await getSupabaseAdmin().from("youtube_content").select("id,song_title,video_link,tags,updated_at").order("song_title");
  if (error) return NextResponse.json({ error: "Unable to load YouTube content. Apply the YouTube content migration first." }, { status: 500 });
  return NextResponse.json({ videos: data || [] });
}

export async function PATCH(request: Request) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json();
  if (typeof body.id !== "string" || typeof body.video_link !== "string" || typeof body.tags !== "string") {
    return NextResponse.json({ error: "A video row, link, and tags are required." }, { status: 400 });
  }
  if (body.tags.length > 500) return NextResponse.json({ error: "YouTube tags must be 500 characters or fewer." }, { status: 400 });
  if (body.video_link && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(body.video_link)) {
    return NextResponse.json({ error: "Enter a valid YouTube video link." }, { status: 400 });
  }
  const { data, error } = await getSupabaseAdmin().from("youtube_content").update({ video_link: body.video_link.trim(), tags: body.tags.trim(), updated_at: new Date().toISOString() }).eq("id", body.id).select("id,song_title,video_link,tags,updated_at").single();
  if (error) return NextResponse.json({ error: "Unable to save this YouTube content." }, { status: 500 });
  return NextResponse.json({ video: data });
}
