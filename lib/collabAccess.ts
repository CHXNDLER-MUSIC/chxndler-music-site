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

function parseSession(token?: string) {
  if (!token) return null;
  const [payload, sig, ...extra] = token.split(".");
  if (!payload || !sig || extra.length) return null;
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(parsed.exp) && parsed.exp > Math.floor(Date.now() / 1000) && typeof parsed.inviteId === "string"
      ? parsed as { inviteId: string; exp: number } : null;
  } catch { return null; }
}

export async function getCollabInviteSession() {
  const jar = await cookies();
  const session = parseSession(jar.get(COLLAB_ACCESS_COOKIE)?.value);
  if (!session) return null;
  // Collaborator access is granted only by a live, unrevoked invitation.
  // Older name-based sessions are intentionally no longer accepted.
  if (!session.inviteId) return null;
  const { data, error } = await getSupabaseAdmin().from("collaboration_invites")
    .select("id,display_name,song_id,revoked_at,expires_at")
    .eq("id", session.inviteId).is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).maybeSingle();
  return error || !data ? null : { ...data, source: "invite" as const };
}
