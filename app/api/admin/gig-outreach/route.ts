import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const fields = ["venue", "neighborhood", "address", "city", "first_name", "last_name", "website", "contact_email", "phone", "capacity", "subject", "email_copy", "form_url", "date_sent", "notes", "performed", "contact_id", "song_id"] as const;

function valuesFrom(body: Record<string, unknown>) {
  const values: Record<string, string | boolean | null> = {};
  for (const field of fields) {
    const value = body[field];
    if (field === "performed") {
      if (typeof value === "boolean") values[field] = value;
    } else if (field === "contact_id" || field === "song_id") {
      if (value === "") values[field] = null;
      else if (typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value)) values[field] = value;
    } else if (typeof value === "string") {
      values[field] = field === "date_sent" && !value ? null : value.trim();
    }
  }
  return values;
}

export async function GET() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const { data, error } = await getSupabaseAdmin().from("gig_outreach").select("*").order("venue");
  if (error) return NextResponse.json({ error: "Unable to load gig outreach. Apply the gig outreach migration first." }, { status: 500 });
  return NextResponse.json({ records: data || [] });
}

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json();
  if (typeof body.venue !== "string" || !body.venue.trim()) return NextResponse.json({ error: "Venue name is required." }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("gig_outreach").insert(valuesFrom(body)).select("*").single();
  if (error) return NextResponse.json({ error: "Unable to create this venue." }, { status: 500 });
  return NextResponse.json({ record: data });
}

export async function PATCH(request: Request) {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  const body = await request.json();
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Invalid venue." }, { status: 400 });
  const values = valuesFrom(body);
  if (typeof values.venue !== "string" || !values.venue.trim()) return NextResponse.json({ error: "Venue name is required." }, { status: 400 });
  values.updated_at = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin().from("gig_outreach").update(values).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ error: "Unable to save this venue." }, { status: 500 });
  return NextResponse.json({ record: data });
}
