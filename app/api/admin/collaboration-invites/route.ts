import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export async function GET() {
  const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden();
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("collaboration_invites")
    .select("id,display_name,first_name,last_name,artist_name,phone,song_id,invite_scope,invitee_email,revoked_at,expires_at,last_accessed_at,created_at,songs(title)")
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
  const firstName = typeof body.firstName === "string" ? body.firstName.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  const artistName = typeof body.artistName === "string" ? body.artistName.trim().replace(/\s+/g, " ").slice(0, 120) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : "";
  const songId = typeof body.songId === "string" ? body.songId : "";
  const scope = ["catalog", "video", "song"].includes(body.scope) ? body.scope as "catalog" | "video" | "song" : songId ? "song" : "catalog";
  const inviteeEmail = typeof body.inviteeEmail === "string" ? body.inviteeEmail.trim().slice(0, 320).toLowerCase() : "";
  const personalMessage = typeof body.personalMessage === "string" ? body.personalMessage.trim().slice(0, 1200) : "";
  const contributionType = ["Feature / Vocals", "Remix", "Other"].includes(body.contributionType) ? body.contributionType : "Other";
  const contactId = typeof body.contactId === "string" && /^[0-9a-f-]{36}$/i.test(body.contactId) ? body.contactId : null;
  const expiryDays = body.expiryDays === "never" ? null : Number(body.expiryDays ?? 30);
  if (!displayName) return NextResponse.json({ error: "Enter a display name for this invitation." }, { status: 400 });
  if (scope === "song" && !/^[0-9a-f-]{36}$/i.test(songId)) return NextResponse.json({ error: "Select the song this invitation is for." }, { status: 400 });
  if (inviteeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (expiryDays !== null && (!Number.isInteger(expiryDays) || expiryDays < 1 || expiryDays > 365)) return NextResponse.json({ error: "Choose an expiration from 1 to 365 days, or no expiration." }, { status: 400 });

  const db = getSupabaseAdmin();
  let song: { id: string; collaboration_enabled: boolean } | null = null;
  if (scope === "song") {
    const result = await db.from("songs").select("id,collaboration_enabled").eq("id", songId).maybeSingle();
    song = result.data;
    if (!song) return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const normalizedName = normalize(displayName);
  const expiresAt = expiryDays === null ? null : new Date(Date.now() + expiryDays * 86400000).toISOString();
  const { data, error } = await db.from("collaboration_invites")
    .insert({ display_name: displayName, normalized_display_name: normalizedName, invite_scope: scope, invitee_email: inviteeEmail || null, contact_id: contactId, personal_message: personalMessage, contribution_type: contributionType, song_id: scope === "song" ? songId : null,
      first_name: firstName || null, last_name: lastName || null, artist_name: artistName || null, phone: phone || null,
      token_hash: tokenHash, expires_at: expiresAt, revoked_at: null, last_accessed_at: null })
    .select("id,display_name,first_name,last_name,artist_name,phone,expires_at,created_at").single();
  if (error || !data) {
    console.error("[admin/collaboration-invites] create failed", error);
    return NextResponse.json({ error: "Could not create the invitation. Apply the personalized invitations migration first." }, { status: 503 });
  }
  let oldInvites = db.from("collaboration_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("normalized_display_name", normalizedName).eq("invite_scope", scope)
    .neq("id", data.id).is("revoked_at", null);
  oldInvites = scope === "song" ? oldInvites.eq("song_id", songId) : oldInvites.is("song_id", null);
  const { error: revokeError } = await oldInvites;
  if (revokeError) {
    console.error("[admin/collaboration-invites] replaced invite revocation failed", revokeError);
    await db.from("collaboration_invites").update({ revoked_at: new Date().toISOString() }).eq("id", data.id);
    return NextResponse.json({ error: "The new link could not safely replace the existing invitation." }, { status: 500 });
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const link = scope === "catalog" ? `${base}/collab` : `${base}/collab/invite/${token}`;
  return NextResponse.json({ invitation: data, link });
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
