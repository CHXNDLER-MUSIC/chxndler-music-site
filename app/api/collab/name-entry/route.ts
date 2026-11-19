import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { collabSessionMaxAge, COLLAB_ACCESS_COOKIE, createCollabSession } from "@/lib/collabAccess";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalize = (value: string) => value.trim().normalize("NFKC").replace(/\s+/g, " ").toLocaleLowerCase("en-US");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const firstName = typeof body.firstName === "string" ? body.firstName.trim().slice(0, 80) : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim().slice(0, 80) : "";
    const artistName = typeof body.artistName === "string" ? body.artistName.trim().slice(0, 120) : "";
    // Prefer the artist name when both are supplied, then fall back to legal name.
    const candidates = [...new Set([normalize(artistName), firstName && lastName ? normalize(`${firstName} ${lastName}`) : ""].filter(Boolean))];
    if (!candidates.length) return NextResponse.json({ error: "Enter your first and last name or your artist name." }, { status: 400 });

    const db = getSupabaseAdmin();
    const ip = request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
    const ipHash = createHash("sha256").update(`${process.env.SUPABASE_SERVICE_ROLE_KEY}:${ip}:collab-name-entry`).digest("hex");
    const rate = await db.rpc("consume_collaboration_rate_limit", { p_ip_hash: ipHash });
    if (rate.error || typeof rate.data !== "boolean") {
      console.error("[collab/name-entry] rate-limit check failed", rate.error);
      return NextResponse.json({ error: "Access check is temporarily unavailable. Please try your invitation link or try again later." }, { status: 503 });
    }
    if (!rate.data) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

    const now = new Date().toISOString();
    let rows: Array<{ id: string; display_name: string; normalized_display_name: string; revoked_at: string | null; expires_at: string | null }> = [];
    for (const candidate of candidates) {
      const { data, error } = await db.from("collaboration_invites")
        .select("id,display_name,normalized_display_name,revoked_at,expires_at")
        .eq("normalized_display_name", candidate)
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(10);
      if (error) throw error;
      if (data?.length) { rows = data; break; }
    }
    if (!rows?.length) return NextResponse.json({ error: "We couldn't find active collaboration access for that name. Check the spelling or contact CHXNDLER." }, { status: 403 });
    const matches = [...new Map(rows.map((row) => [row.id, row])).values()];
    if (matches.length !== 1) return NextResponse.json({ error: "More than one active collaboration invitation matches. Please use your personalized link." }, { status: 409 });

    const invite = matches[0];
    const { error: accessError } = await db.from("collaboration_invites").update({ last_accessed_at: now }).eq("id", invite.id);
    if (accessError) throw accessError;
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    response.cookies.set(COLLAB_ACCESS_COOKIE, createCollabSession(invite.id), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: collabSessionMaxAge,
    });
    return response;
  } catch (error) {
    console.error("[collab/name-entry] access check failed", error);
    return NextResponse.json({ error: "Access check is unavailable right now. Please try again later." }, { status: 503 });
  }
}
