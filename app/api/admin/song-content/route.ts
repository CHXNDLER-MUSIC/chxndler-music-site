import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function gate() { const auth = await getApiUser(); if (!auth) return unauthorized(); if (!isAdminUser(auth.user)) return forbidden(); return null; }
const statuses = ["Idea", "Creating", "Ready", "Published", "Archived", "Cancelled"];
const platforms = ["Instagram", "TikTok", "YouTube Shorts", "Facebook", "Other"];
const validId = (id: unknown) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);

export async function GET(request: Request) {
  const denied = await gate(); if (denied) return denied;
  const songId = new URL(request.url).searchParams.get("songId");
  if (!validId(songId)) return NextResponse.json({ error: "Choose a valid song." }, { status: 400 });
  const db = getSupabaseAdmin();
  const [{ data: song, error: songError }, { data: items, error }, { data: videoProject }] = await Promise.all([
    db.from("songs").select("id,title,release_date").eq("id", songId).maybeSingle(),
    db.from("song_content_items").select("*").eq("song_id", songId).order("planned_publish_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true }),
    db.from("music_video_projects").select("workspace").eq("song_id", songId).eq("project_type", "primary").maybeSingle(),
  ]);
  if (songError || error) return NextResponse.json({ error: "Unable to load content. Apply the song content planning migration first." }, { status: 503 });
  if (!song) return NextResponse.json({ error: "Song not found." }, { status: 404 });
  const ids = (items || []).map(item => item.id);
  const { data: tasks } = ids.length ? await db.from("admin_tasks").select("id,content_item_id,title,status,priority,due_at").in("content_item_id", ids) : { data: [] as any[] };
  const production = (videoProject?.workspace as Record<string, any> | null)?.production;
  const deliverables = Array.isArray(production?.deliverables) ? production.deliverables.filter((item: any) => typeof item?.deliveryLink === "string" && /^https:\/\//i.test(item.deliveryLink)).map((item: any) => ({ title: String(item.title || "Video deliverable"), url: item.deliveryLink })) : [];
  return NextResponse.json({ song, deliverables, items: (items || []).map(item => ({ ...item, task: (tasks || []).find(task => task.content_item_id === item.id) || null })) });
}

export async function POST(request: Request) {
  const denied = await gate(); if (denied) return denied;
  const body = await request.json();
  if (!validId(body.song_id) || typeof body.title !== "string" || !body.title.trim()) return NextResponse.json({ error: "Enter a content idea." }, { status: 400 });
  const selectedPlatforms = Array.isArray(body.platforms) ? [...new Set(body.platforms.filter((value: unknown) => platforms.includes(value as string)))] : [];
  const row = { song_id: body.song_id, title: body.title.trim().slice(0, 180), content_type: typeof body.content_type === "string" ? body.content_type.slice(0, 60) : "Short-form video", platforms: selectedPlatforms, status: statuses.includes(body.status) ? body.status : "Idea", planned_publish_date: /^\d{4}-\d{2}-\d{2}$/.test(body.planned_publish_date || "") ? body.planned_publish_date : null, media_url: typeof body.media_url === "string" ? body.media_url.trim().slice(0, 2000) : "", caption_notes: typeof body.caption_notes === "string" ? body.caption_notes.trim().slice(0, 5000) : "", published_url: typeof body.published_url === "string" ? body.published_url.trim().slice(0, 2000) : "" };
  if (row.media_url && !/^https:\/\//i.test(row.media_url)) return NextResponse.json({ error: "Media links must use https://." }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: item, error } = body.id && validId(body.id) ? await db.from("song_content_items").update({ ...row, updated_at: new Date().toISOString() }).eq("id", body.id).eq("song_id", body.song_id).select("*").single() : await db.from("song_content_items").insert(row).select("*").single();
  if (error || !item) return NextResponse.json({ error: "Unable to save content item." }, { status: 500 });
  let task: any = null;
  if (typeof body.next_step === "string" && body.next_step.trim()) {
    if (validId(body.task_id)) {
      const result = await db.from("admin_tasks").update({ title: body.next_step.trim().slice(0, 180), due_at: /^\d{4}-\d{2}-\d{2}$/.test(body.task_due_at || "") ? body.task_due_at : null, updated_at: new Date().toISOString() }).eq("id", body.task_id).eq("content_item_id", item.id).select("id,content_item_id,title,status,priority,due_at").maybeSingle();
      task = result.data;
    } else {
      const result = await db.from("admin_tasks").insert({ business_area: "chxndler", song_id: item.song_id, content_item_id: item.id, title: body.next_step.trim().slice(0, 180), description: `Content: ${item.title}`, due_at: /^\d{4}-\d{2}-\d{2}$/.test(body.task_due_at || "") ? body.task_due_at : null }).select("id,content_item_id,title,status,priority,due_at").single();
      if (result.error) return NextResponse.json({ error: "Content saved, but its task could not be saved." }, { status: 500 });
      task = result.data;
    }
  }
  return NextResponse.json({ item: { ...item, task } });
}
