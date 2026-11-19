import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export async function GET() {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("collaboration_invites")
    .select("id,display_name,song_id,revoked_at,expires_at,last_accessed_at,created_at,songs(title)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load invitations. Apply the personalized invitations migration first." }, { status: 503 });
  const ids = (data || []).map(row => row.id);
  const { data: requests } = ids.length
    ? await db.from("collaboration_requests").select("invite_id").in("invite_id", ids)
    : { data: [] as Array<{ invite_id: string | null }> };
  const counts = new Map<string, number>();
  for (const row of requests || []) if (row.invite_id) counts.set(row.invite_id, (counts.get(row.invite_id) || 0) + 1);
  const now = Date.now();
  return NextResponse.json({ invitations: (data || []).map(row => ({ ...row,
    status: row.revoked_at || (row.expires_at && new Date(row.expires_at).getTime() <= now) ? "Revoked" : "Active",
    requests_count: counts.get(row.id) || 0,
  })) });
}

export async function POST(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json();
  const displayName = typeof body.displayName === "string" ? body.displayName.trim().replace(/\s+/g, " ").slice(0, 120) : "";
  const songId = typeof body.songId === "string" ? body.songId : "";
  const expiryDays = body.expiryDays === "never" ? null : Number(body.expiryDays ?? 30);
  if (!displayName) return NextResponse.json({ error: "Enter a display name for this invitation." }, { status: 400 });
  if (!/^[0-9a-f-]{36}$/i.test(songId)) return NextResponse.json({ error: "Select the song this invitation is for." }, { status: 400 });
  if (expiryDays !== null && (!Number.isInteger(expiryDays) || expiryDays < 1 || expiryDays > 365)) return NextResponse.json({ error: "Choose an expiration from 1 to 365 days, or no expiration." }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data: song } = await db.from("songs").select("id,collaboration_enabled").eq("id", songId).maybeSingle();
  if (!song) return NextResponse.json({ error: "Song not found." }, { status: 404 });
  const { error: enabledError } = await db.from("songs").update({ collaboration_enabled: true }).eq("id", songId);
  if (enabledError) return NextResponse.json({ error: "Apply the collaboration schema migration before creating invites." }, { status: 503 });

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const normalizedName = normalize(displayName);
  const expiresAt = expiryDays === null ? null : new Date(Date.now() + expiryDays * 86400000).toISOString();
  const { data, error } = await db.from("collaboration_invites")
    .insert({ display_name: displayName, normalized_display_name: normalizedName, song_id: songId,
      token_hash: tokenHash, expires_at: expiresAt, revoked_at: null, last_accessed_at: null })
    .select("id,display_name,expires_at,created_at").single();
  if (error || !data) {
    console.error("[admin/collaboration-invites] create failed", error);
    if (song.collaboration_enabled !== true) await db.from("songs").update({ collaboration_enabled: false }).eq("id", songId);
    return NextResponse.json({ error: "Could not create the invitation. Apply the personalized invitations migration first." }, { status: 503 });
  }
  const { error: revokeError } = await db.from("collaboration_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("song_id", songId).eq("normalized_display_name", normalizedName)
    .neq("id", data.id).is("revoked_at", null);
  if (revokeError) {
    console.error("[admin/collaboration-invites] replaced invite revocation failed", revokeError);
    await db.from("collaboration_invites").update({ revoked_at: new Date().toISOString() }).eq("id", data.id);
    if (song.collaboration_enabled !== true) await db.from("songs").update({ collaboration_enabled: false }).eq("id", songId);
    return NextResponse.json({ error: "The new link could not safely replace the existing invitation." }, { status: 500 });
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  return NextResponse.json({ invitation: data, link: `${base}/collab/invite/${token}` });
}

export async function PATCH(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json();
  if (body.disableSong === true && typeof body.songId === "string" && /^[0-9a-f-]{36}$/i.test(body.songId)) {
    const db = getSupabaseAdmin(), now = new Date().toISOString();
    const { error: songError } = await db.from("songs").update({ collaboration_enabled: false }).eq("id", body.songId);
    if (songError) return NextResponse.json({ error: "Unable to disable collaboration requests for this song." }, { status: 500 });
    const { error: inviteError } = await db.from("collaboration_invites").update({ revoked_at: now }).eq("song_id", body.songId).is("revoked_at", null);
    if (inviteError) return NextResponse.json({ error: "Song requests were disabled, but some invitations could not be revoked." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (typeof body.id !== "string") return NextResponse.json({ error: "Invitation ID is required." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("collaboration_invites").update({ revoked_at: new Date().toISOString() }).eq("id", body.id).is("revoked_at", null);
  if (error) return NextResponse.json({ error: "Unable to revoke this invitation." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
