import { NextResponse } from "next/server";
import { createCollabAccessToken, COLLAB_ACCESS_COOKIE } from "@/lib/collabAccess";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const normalized = (value: unknown) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase() : "";
const digits = (value: string) => value.replace(/\D/g, "");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const firstName = normalized(body.firstName);
    const lastName = normalized(body.lastName);
    const artistName = normalized(body.artistName);
    const email = normalized(body.email);
    const phone = typeof body.phone === "string" ? digits(body.phone) : "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    if (!fullName && !artistName && !email && !phone) {
      return NextResponse.json({ error: "Enter your artist name, full name, email, or phone number." }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const [{ data, error }, { data: authorizedPeople, error: authorizedError }] = await Promise.all([
      db.from("collaboration_requests").select("artist_name,email,phone").limit(5000),
      db.from("collab_authorized_people").select("normalized_name"),
    ]);
    if (error) throw error;
    if (authorizedError) throw authorizedError;
    const matchesAuthorizedName = [fullName, artistName].some(name => !!name && (authorizedPeople || []).some(person => normalized(person.normalized_name) === name));
    const matchesRequest = (data || []).some(row => {
      const storedName = normalized(row.artist_name);
      return (!!fullName && fullName === storedName)
        || (!!artistName && artistName === storedName)
        || (!!email && email === normalized(row.email))
        || (!!phone && phone === digits(String(row.phone || "")));
    });
    if (!matchesAuthorizedName && !matchesRequest) return NextResponse.json({ error: "We couldn’t match those details to an authorized person or collaboration request." }, { status: 403 });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COLLAB_ACCESS_COOKIE, createCollabAccessToken(), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/collab", maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (error) {
    console.error("[collab/access] identity check failed", error);
    return NextResponse.json({ error: "Unable to check collaboration access right now." }, { status: 500 });
  }
}
