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
  const fileKey = slugify(stem.replace(/-(acoustic|instrumental|remix|demo|live|full|full-version)$/i, ""));
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
  const storage = db.storage.from("tracks");
  let actualPath = path;
  let { data, error: signedError } = await storage.createSignedUrl(actualPath, 60 * 60);
  if (signedError || !data?.signedUrl) {
    const requestedVariant = /-instrumental$/i.test(stem) ? "instrumental" : /-(full|full-version)$/i.test(stem) ? "full" : "";
    const expectedKeys = new Set([slugify(song.slug), slugify(song.title)]);
    const matches = (candidatePath: string) => {
      const filename = candidatePath.split("/").pop() || "";
      const candidateStem = filename.replace(/\.[^.]+$/, "");
      const variant = /-instrumental$/i.test(candidateStem) ? "instrumental" : /-(full|full-version)$/i.test(candidateStem) ? "full" : "";
      const base = slugify(candidateStem.replace(/-(instrumental|full|full-version)$/i, ""));
      return variant === requestedVariant && expectedKeys.has(base);
    };
    const walk = async (folder = "", depth = 0): Promise<string | null> => {
      if (depth > 6) return null;
      const { data: entries, error } = await storage.list(folder, { limit: 1000 });
      if (error) return null;
      for (const entry of entries || []) {
        if (!entry.name) continue;
        const candidate = folder ? `${folder}/${entry.name}` : entry.name;
        if (entry.id && matches(candidate)) return candidate;
        if (!entry.id) {
          const nested = await walk(candidate, depth + 1);
          if (nested) return nested;
        }
      }
      return null;
    };
    const resolved = await walk();
    if (resolved) {
      actualPath = resolved;
      ({ data, error: signedError } = await storage.createSignedUrl(actualPath, 60 * 60));
    }
  }
  if (signedError || !data?.signedUrl) return NextResponse.json({ error: "Audio file not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(data.signedUrl, { status: 307, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
