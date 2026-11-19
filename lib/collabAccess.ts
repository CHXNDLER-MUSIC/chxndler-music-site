import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const COLLAB_ACCESS_COOKIE = "chxndler_collab_session";
export const collabSessionMaxAge = 60 * 60 * 24 * 7;

function signature(payload: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Collaboration session signing key is not configured.");
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createCollabSession(inviteId: string) {
  const payload = Buffer.from(JSON.stringify({ inviteId, exp: Math.floor(Date.now() / 1000) + collabSessionMaxAge })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function createAuthorizedPersonSession(personId: string) {
  const payload = Buffer.from(JSON.stringify({ personId, exp: Math.floor(Date.now() / 1000) + collabSessionMaxAge })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function parseSession(token?: string) {
  if (!token) return null;
  const [payload, sig, ...extra] = token.split(".");
  if (!payload || !sig || extra.length) return null;
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(parsed.exp) && parsed.exp > Math.floor(Date.now() / 1000) &&
      (typeof parsed.inviteId === "string" || typeof parsed.personId === "string")
      ? parsed as { inviteId?: string; personId?: string; exp: number } : null;
  } catch { return null; }
}

export async function getCollabInviteSession() {
  const jar = await cookies();
  const session = parseSession(jar.get(COLLAB_ACCESS_COOKIE)?.value);
  if (!session) return null;
  if (session.personId) {
    const { data, error } = await getSupabaseAdmin().from("collab_authorized_people")
      .select("id,full_name").eq("id", session.personId).maybeSingle();
    return error || !data ? null : { id: data.id, display_name: data.full_name, email: "", song_id: null, scope: "catalog" as const, source: "authorized_person" as const };
  }
  if (!session.inviteId) return null;
  const { data, error } = await getSupabaseAdmin().from("collaboration_invites")
    .select("id,display_name,song_id,invite_scope,invitee_email,revoked_at,expires_at")
    .eq("id", session.inviteId).is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).maybeSingle();
  return error || !data ? null : { ...data, scope: data.invite_scope || (data.song_id ? "song" : "catalog"), email: data.invitee_email || "", source: "invite" as const };
}
