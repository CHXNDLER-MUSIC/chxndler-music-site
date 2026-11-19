import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { collabSessionMaxAge, COLLAB_ACCESS_COOKIE, createAuthorizedPersonSession } from "@/lib/collabAccess";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalize = (value: string) => value.trim().normalize("NFKC").replace(/\s+/g, " ").toLocaleLowerCase("en-US");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const firstName = typeof body.firstName === "string" ? body.firstName.trim().slice(0, 80) : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim().slice(0, 80) : "";
    if (!firstName || !lastName) return NextResponse.json({ error: "Enter both your first and last name." }, { status: 400 });

    const db = getSupabaseAdmin();
    const ip = request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
    const ipHash = createHash("sha256").update(`${process.env.SUPABASE_SERVICE_ROLE_KEY}:${ip}:collab-name-entry`).digest("hex");
    const rate = await db.rpc("consume_collaboration_rate_limit", { p_ip_hash: ipHash });
    if (rate.error || typeof rate.data !== "boolean") {
      console.error("[collab/name-entry] rate-limit check failed", rate.error);
      return NextResponse.json({ error: "Access check is temporarily unavailable. Please try your invitation link or try again later." }, { status: 503 });
    }
    if (!rate.data) return NextResponse.json({ error: "Too many attempts. Please try again later or use your personalized invitation link." }, { status: 429 });

    const fullName = normalize(`${firstName} ${lastName}`);
    const { data: person, error } = await db.from("collab_authorized_people")
      .select("id,full_name,normalized_name")
      .eq("normalized_name", fullName)
      .maybeSingle();
    if (error) throw error;
    if (!person) return NextResponse.json({ error: "That name isn't on the approved collaborator list. Check the spelling or use your personalized invitation link." }, { status: 403 });

    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    response.cookies.set(COLLAB_ACCESS_COOKIE, createAuthorizedPersonSession(person.id), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: collabSessionMaxAge,
    });
    return response;
  } catch (error) {
    console.error("[collab/name-entry] access check failed", error);
    return NextResponse.json({ error: "Access check is unavailable right now. Please use your invitation link or try again later." }, { status: 503 });
  }
}
