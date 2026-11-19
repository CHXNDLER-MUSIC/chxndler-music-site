import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function gate() { const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden(); return null; }
const fields = ["song_id", "contact_id", "opportunity_url", "contact_method", "record_type", "playlist_name", "platform", "playlist_genre", "link", "category", "contact_name", "organization", "contact_email", "pitch", "sent_at", "status", "follow_up_at", "notes", "result"] as const;
function clean(body: Record<string, unknown>) {
  const row: Record<string, unknown> = {};
  for (const field of fields) if (field in body) {
    const value = body[field];
    if (field === "song_id" || field === "contact_id") {
      if (value !== null && value !== "" && (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value))) throw new Error(field === "song_id" ? "Choose a valid song." : "Choose a valid contact.");
      row[field] = value || null;
    } else if (field === "sent_at" || field === "follow_up_at") {
      if (value !== null && value !== "" && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00`)))) throw new Error(`Enter a valid ${field === "sent_at" ? "sent" : "follow-up"} date.`);
      row[field] = value || null;
    } else {
      if (value !== null && typeof value !== "string") throw new Error(`Invalid ${field.replaceAll("_", " ")}.`);
      if (field === "opportunity_url" && value && (typeof value !== "string" || !/^https?:\/\//i.test(value))) throw new Error("Enter a valid opportunity URL starting with http or https.");
      row[field] = typeof value === "string" ? value.trim().slice(0, field === "pitch" || field === "notes" ? 10000 : field === "result" ? 2000 : field === "opportunity_url" ? 1000 : 500) || null : null;
    }
  }
  if (row.status && !["Planned", "Contacted", "Interested", "Won", "Closed", "Not interested", "Sent", "Follow-up", "Accepted", "Declined"].includes(String(row.status))) throw new Error("Choose a valid outreach status.");
  if (row.record_type && !["prospect", "opportunity"].includes(String(row.record_type))) throw new Error("Choose a valid opportunity type.");
  if (row.category && !["Playlists", "Blogs & Press", "Influencers", "Radio", "Sync Pitching", "Record Labels", "Brands & Businesses", "Other"].includes(String(row.category))) throw new Error("Choose a valid category.");
  return row;
}
export async function GET() {
  const denied = await gate(); if (denied) return denied;
  const db = getSupabaseAdmin();
  const [records, songs, contacts] = await Promise.all([db.from("outreach_records").select("id,song_id,contact_id,opportunity_url,contact_method,record_type,playlist_name,platform,playlist_genre,link,song_title,category,contact_name,organization,contact_email,pitch,sent_at,status,follow_up_at,notes,result,created_at,updated_at").order("updated_at", { ascending: false }), db.from("songs").select("id,title,slug").order("title"), db.from("marketing_contacts").select("id,first_name,last_name,email,venue,industry_category,connection_status").order("first_name")]);
  if (records.error) return NextResponse.json({ error: records.error.message }, { status: 503 });
  const titles = new Map((songs.data || []).map(song => [song.id, song.title]));
  return NextResponse.json({ songs: songs.data || [], contacts: contacts.data || [], records: (records.data || []).map(row => ({ ...row, song_title: titles.get(row.song_id) || row.song_title || "" })) });
}
export async function POST(request: Request) {
  const denied = await gate(); if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = await request.json(); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(); }
  catch { return NextResponse.json({ error: "Invalid outreach record." }, { status: 400 }); }
  try {
    const row = clean(body);
    if (![row.contact_name, row.organization, row.playlist_name].some(value => typeof value === "string" && value.trim())) return NextResponse.json({ error: "Enter a target or opportunity name." }, { status: 400 });
    if (typeof row.contact_name === "string") row.contact_name = row.contact_name.trim().slice(0, 180); row.status ??= "Planned"; row.record_type ??= "opportunity"; row.updated_at = new Date().toISOString();
    const { data, error } = await getSupabaseAdmin().from("outreach_records").insert(row).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to save this outreach record." }, { status: 500 });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid outreach record." }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  const denied = await gate(); if (denied) return denied;
  let body: Record<string, unknown>;
  try { body = await request.json(); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(); }
  catch { return NextResponse.json({ error: "Invalid outreach record." }, { status: 400 }); }
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Choose a valid outreach record." }, { status: 400 });
  try {
    const row = clean(body); row.updated_at = new Date().toISOString();
    const { data, error } = await getSupabaseAdmin().from("outreach_records").update(row).eq("id", body.id).select("id").maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Unable to update this outreach record." }, { status: error ? 500 : 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid outreach record." }, { status: 400 }); }
}
