import { createHmac, timingSafeEqual } from "node:crypto";

export const COLLAB_ACCESS_COOKIE = "chxndler_collab_access";
const ACCESS_TTL_SECONDS = 60 * 60 * 12;

function secret() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("Collaboration access signing key is not configured.");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createCollabAccessToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function isValidCollabAccessToken(token?: string) {
  if (!token) return false;
  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length) return false;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(data.exp) && data.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}
