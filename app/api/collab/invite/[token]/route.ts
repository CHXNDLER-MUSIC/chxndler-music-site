import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { collabSessionMaxAge, COLLAB_ACCESS_COOKIE, createCollabSession } from "@/lib/collabAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data } = await getSupabaseAdmin().from("collaboration_invites")
    .select("id,display_name,invite_scope,song_id,personal_message")
    .eq("token_hash", tokenHash).is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).maybeSingle();
  return data;
}

type Context = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { token } = await params;
  try {
    const invite = await findInvite(token);
    if (!invite) return NextResponse.json({ error: "This invitation is invalid, expired, or has been revoked." }, { status: 404, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    return NextResponse.json({ displayName: invite.display_name, scope: invite.invite_scope || (invite.song_id ? "song" : "catalog"), songId: invite.song_id, personalMessage: invite.personal_message || "" }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    console.error("[collab/invite] lookup failed", error);
    return NextResponse.json({ error: "This invitation could not be checked right now." }, { status: 503 });
  }
}

export async function POST(_request: Request, { params }: Context) {
  const { token } = await params;
  try {
    const invite = await findInvite(token);
    if (!invite) return NextResponse.json({ error: "This invitation is invalid, expired, or has been revoked." }, { status: 404, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    const { error } = await getSupabaseAdmin().from("collaboration_invites").update({ last_accessed_at: new Date().toISOString() }).eq("id", invite.id);
    if (error) throw error;
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    response.cookies.set(COLLAB_ACCESS_COOKIE, createCollabSession(invite.id), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/", maxAge: collabSessionMaxAge,
    });
    return response;
  } catch (error) {
    console.error("[collab/invite] entry failed", error);
    return NextResponse.json({ error: "Unable to enter the collaboration space right now." }, { status: 503 });
  }
}
