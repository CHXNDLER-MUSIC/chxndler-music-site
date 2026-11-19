import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
const allowedStatuses = ["not_contacted", "connected", "follow_up", "active", "do_not_contact"];
const allowedFields = ["first_name", "last_name", "email", "phone", "venue", "note", "industry_category", "relationship", "referred_by", "connection_status", "last_contacted_at", "follow_up_at"] as const;
const clean = (value: unknown, limit = 300) => typeof value === "string" ? value.trim().slice(0, limit) || null : null;

async function authorize() {
  const auth = await getApiUser();
  if (!auth) return { response: unauthorized() };
  if (!isAdminUser(auth.user)) return { response: forbidden() };
  return { response: null };
}

export async function GET(request: Request) {
  const access = await authorize();
  if (access.response) return access.response;
  const query = (new URL(request.url).searchParams.get("q") || "").trim().replace(/[%,()]/g, "");
  let builder = getSupabaseAdmin().from("marketing_contacts").select("id,first_name,last_name,email,phone,venue,note,industry_category,relationship,referred_by,connection_status,last_contacted_at,follow_up_at,created_at,updated_at").order("first_name", { ascending: true });
  if (query) builder = builder.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,venue.ilike.%${query}%,industry_category.ilike.%${query}%,relationship.ilike.%${query}%,referred_by.ilike.%${query}%`);
  const { data, error } = await builder;
  if (error) return NextResponse.json({ error: "Unable to load industry connections. Apply the contacts migrations first." }, { status: 500 });
  return NextResponse.json({ contacts: data || [] });
}

export async function POST(request: Request) {
  const access = await authorize();
  if (access.response) return access.response;
  const body = await request.json();
  const row: Record<string, unknown> = {
    first_name: clean(body.first_name, 120), last_name: clean(body.last_name, 120),
    email: clean(body.email, 320), phone: clean(body.phone, 60), venue: clean(body.venue, 500),
    note: clean(body.note, 5000), industry_category: clean(body.industry_category, 120) || "Other",
    relationship: clean(body.relationship, 500), referred_by: clean(body.referred_by, 300),
    connection_status: allowedStatuses.includes(body.connection_status) ? body.connection_status : "not_contacted",
  };
  if (!row.first_name && !row.last_name) return NextResponse.json({ error: "Enter a contact name." }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("marketing_contacts").insert(row).select("id").single();
  if (error) return NextResponse.json({ error: "Unable to save this contact." }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function PATCH(request: Request) {
  const access = await authorize();
  if (access.response) return access.response;
  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid contact." }, { status: 400 });
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of allowedFields) {
    if (!(field in body)) continue;
    if (field === "connection_status") {
      if (!allowedStatuses.includes(body[field])) return NextResponse.json({ error: "Invalid connection status." }, { status: 400 });
      update[field] = body[field];
    } else if (field === "last_contacted_at" || field === "follow_up_at") {
      const value = body[field];
      if (value !== null && value !== "" && (typeof value !== "string" || Number.isNaN(Date.parse(value)))) return NextResponse.json({ error: "Invalid date." }, { status: 400 });
      update[field] = value ? new Date(value).toISOString() : null;
    } else update[field] = clean(body[field], field === "note" ? 5000 : field === "venue" ? 500 : 500);
  }
  const { error } = await getSupabaseAdmin().from("marketing_contacts").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: "Unable to update this contact." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
