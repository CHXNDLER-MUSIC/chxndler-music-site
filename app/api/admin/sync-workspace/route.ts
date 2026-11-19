import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function gate() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  return null;
}

export async function GET() {
  const denied = await gate(); if (denied) return denied;
  const db = getSupabaseAdmin();
  const [songs, ideas, opportunities, placements] = await Promise.all([
    db.from("songs").select("id,title,slug").order("title"),
    db.from("sync_ideas").select("*").order("song_title"),
    db.from("sync_opportunities").select("*").order("updated_at", { ascending: false }),
    db.from("sync_placements").select("*").order("placement_date", { ascending: false, nullsFirst: false }),
  ]);
  if (ideas.error || opportunities.error || placements.error) return NextResponse.json({ error: "Apply the sync ideas and workspace migrations before loading sync records." }, { status: 503 });
  const names = new Map((songs.data || []).map(song => [song.id, song.title]));
  return NextResponse.json({ songs: songs.data || [], ideas: (ideas.data || []).map(row => ({ ...row, song_title: names.get(row.song_id) || row.song_title })), opportunities: (opportunities.data || []).map(row => ({ ...row, song_title: names.get(row.song_id) || "" })), placements: (placements.data || []).map(row => ({ ...row, song_title: names.get(row.song_id) || "" })) });
}

const tables = { opportunity: "sync_opportunities", placement: "sync_placements" } as const;
const nullable = new Set(["deadline", "submitted_at", "follow_up_at", "placement_date", "song_id", "potential_fee", "fee"]);

export async function POST(request: Request) {
  const denied = await gate(); if (denied) return denied;
  const body = await request.json();
  if (typeof body.kind !== "string" || !Object.hasOwn(tables, body.kind)) return NextResponse.json({ error: "Choose an opportunity or placement." }, { status: 400 });
  const kind = body.kind as keyof typeof tables;
  const allowed = kind === "opportunity"
    ? ["song_id", "project_name", "contact_name", "organization", "contact_email", "media_type", "deadline", "submitted_at", "status", "potential_fee", "follow_up_at", "notes"]
    : ["song_id", "project_name", "media_type", "usage_details", "territory", "term", "agreement_reference", "fee", "payment_status", "placement_date"];
  const row: Record<string, unknown> = {};
  for (const field of allowed) if (field in body) row[field] = body[field] === "" && nullable.has(field) ? null : body[field];
  if (typeof row.project_name !== "string" || !row.project_name.trim()) return NextResponse.json({ error: "Enter a project name." }, { status: 400 });
  row.project_name = String(row.project_name).trim().slice(0, 240);
  row.updated_at = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin().from(tables[kind]).insert(row).select("id").single();
  if (error) return NextResponse.json({ error: "Unable to save this sync record." }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const denied = await gate(); if (denied) return denied;
  const body = await request.json();
  if (body.kind === "idea") {
    if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Choose a valid sync idea." }, { status: 400 });
    const allowed = ["song_id", "song_title", "core_emotion", "big_category", "movies", "tv_cartoons", "anime", "text_hooks", "scenes_to_search", "notes"];
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowed) if (field in body) update[field] = body[field] === "" && field === "song_id" ? null : body[field];
    if (typeof update.song_title === "string" && !update.song_title.trim()) return NextResponse.json({ error: "Song title is required." }, { status: 400 });
    const { error } = await getSupabaseAdmin().from("sync_ideas").update(update).eq("id", body.id);
    if (error) return NextResponse.json({ error: "Unable to update this sync idea." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (typeof body.kind !== "string" || !Object.hasOwn(tables, body.kind) || typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Choose a valid sync record." }, { status: 400 });
  const kind = body.kind as keyof typeof tables;
  const allowed = kind === "opportunity"
    ? ["song_id", "project_name", "contact_name", "organization", "contact_email", "media_type", "deadline", "submitted_at", "status", "potential_fee", "follow_up_at", "notes"]
    : ["song_id", "project_name", "media_type", "usage_details", "territory", "term", "agreement_reference", "fee", "payment_status", "placement_date"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of allowed) if (field in body) update[field] = body[field] === "" && nullable.has(field) ? null : body[field];
  const { error } = await getSupabaseAdmin().from(tables[kind]).update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: "Unable to update this sync record." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
