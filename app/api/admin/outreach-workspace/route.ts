import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function gate() { const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden(); return null; }
const fields = ["song_id", "category", "contact_name", "organization", "contact_email", "pitch", "sent_at", "status", "follow_up_at", "notes", "result"] as const;
function clean(body: Record<string, unknown>) {
  const row: Record<string, unknown> = {};
  for (const field of fields) if (field in body) row[field] = body[field] === "" ? null : body[field];
  if (row.status && !["Planned", "Sent", "Follow-up", "Accepted", "Declined", "Closed"].includes(String(row.status))) throw new Error("Choose a valid outreach status.");
  if (row.category && !["Playlists", "Blogs & Press", "Influencers", "Radio", "Sync Pitching", "Other"].includes(String(row.category))) throw new Error("Choose a valid category.");
  return row;
}
export async function GET() {
  const denied = await gate(); if (denied) return denied;
  const db = getSupabaseAdmin();
  const [records, songs] = await Promise.all([db.from("outreach_records").select("id,song_id,song_title,category,contact_name,organization,contact_email,pitch,sent_at,status,follow_up_at,notes,result,created_at").order("updated_at", { ascending: false }), db.from("songs").select("id,title,slug").order("title")]);
  if (records.error) return NextResponse.json({ error: records.error.message }, { status: 503 });
  const titles = new Map((songs.data || []).map(song => [song.id, song.title]));
  return NextResponse.json({ songs: songs.data || [], records: (records.data || []).map(row => ({ ...row, song_title: titles.get(row.song_id) || row.song_title || "" })) });
}
export async function POST(request: Request) {
  const denied = await gate(); if (denied) return denied;
  const body = await request.json();
  try {
    const row = clean(body);
    if (typeof row.contact_name !== "string" || !row.contact_name.trim()) return NextResponse.json({ error: "Enter a contact or recipient." }, { status: 400 });
    row.contact_name = row.contact_name.trim().slice(0, 180); row.status ??= "Planned"; row.updated_at = new Date().toISOString();
    const { data, error } = await getSupabaseAdmin().from("outreach_records").insert(row).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to save this outreach record." }, { status: 500 });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid outreach record." }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  const denied = await gate(); if (denied) return denied;
  const body = await request.json(); if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Choose a valid outreach record." }, { status: 400 });
  try {
    const row = clean(body); row.updated_at = new Date().toISOString();
    const { error } = await getSupabaseAdmin().from("outreach_records").update(row).eq("id", body.id);
    if (error) return NextResponse.json({ error: "Unable to update this outreach record." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid outreach record." }, { status: 400 }); }
}
