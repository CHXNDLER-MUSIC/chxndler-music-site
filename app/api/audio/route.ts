import { NextResponse } from "next/server";
import { slugify } from "@/lib/slug";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCollabInviteSession } from "@/lib/collabAccess";
import { getApiUser, isAdminUser } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") || "";
  if (!path || path.length > 500 || path.startsWith("/") || path.split("/").some(part => !part || part === "." || part === "..")) {
    return NextResponse.json({ error: "Invalid audio path." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const db = getSupabaseAdmin();
  const stem = path.split("/").pop()!.replace(/\.[^.]+$/, "");
  const fileKey = slugify(stem.replace(/-(acoustic|instrumental|remix|demo|live)$/i, ""));
  const titleKey = fileKey.replaceAll("-", " ");
  const { data: song, error } = await db.from("songs").select("id,slug,title,is_released,ready_for_collab")
    .or(`slug.eq.${fileKey},title.ilike.${titleKey}`).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: "Audio is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (!song) return NextResponse.json({ error: "Audio file not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const auth = await getApiUser();
  const invite = await getCollabInviteSession();
  const admin = !!(auth && isAdminUser(auth.user));
  const invitedSongAccess = !!(invite && invite.scope !== "video" && (invite.source === "authorized_person" || (invite.scope === "catalog" && song.ready_for_collab === true) || (invite.scope === "song" && invite.song_id === song.id)));
  if (!song.is_released && !admin && !invitedSongAccess) {
    return NextResponse.json({ error: "This unreleased track requires an active collaboration invitation." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const { data, error: signedError } = await db.storage.from("tracks").createSignedUrl(path, 60 * 60);
  if (signedError || !data?.signedUrl) return NextResponse.json({ error: "Audio file not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(data.signedUrl, { status: 307, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
