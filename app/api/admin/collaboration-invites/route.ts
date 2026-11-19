import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json(), songId = String(body.songId || "");
  const expiresAt = body.expiresAt == null || body.expiresAt === "" ? null : new Date(String(body.expiresAt));
  if (!/^[0-9a-f-]{36}$/i.test(songId)) return NextResponse.json({ error: "Enter a valid song ID." }, { status: 400 });
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) return NextResponse.json({ error: "Invite expiration must be a future date." }, { status: 400 });
  const db = getSupabaseAdmin(), token = randomBytes(32).toString("base64url"), tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: song } = await db.from("songs").select("id").eq("id", songId).maybeSingle();
  if (!song) return NextResponse.json({ error: "Song not found." }, { status: 404 });
  const { error: enableError } = await db.from("songs").update({ collaboration_enabled: true }).eq("id", songId);
  if (enableError) return NextResponse.json({ error: "Could not enable collaboration for this song. Apply the collaboration schema migration first." }, { status: 503 });
  const { error } = await db.from("collaboration_invites").insert({ song_id: songId, token_hash: tokenHash, expires_at: expiresAt?.toISOString() || null });
  if (error) return NextResponse.json({ error: "Could not create invite." }, { status: 500 });
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  return NextResponse.json({ link: `${base}/collab?invite=${token}`, token });
}

export async function PATCH(request: Request) {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json(), songId = String(body.songId || ""), enabled = body.enabled === true;
  if (!/^[0-9a-f-]{36}$/i.test(songId)) return NextResponse.json({ error: "Enter a valid song ID." }, { status: 400 });
  const db = getSupabaseAdmin();
  const { error } = await db.from("songs").update({ collaboration_enabled: enabled }).eq("id", songId);
  if (error) return NextResponse.json({ error: "Could not update song setting." }, { status: 500 });
  if (!enabled) await db.from("collaboration_invites").update({ revoked_at: new Date().toISOString() }).eq("song_id", songId).is("revoked_at", null);
  return NextResponse.json({ ok: true, enabled });
}
