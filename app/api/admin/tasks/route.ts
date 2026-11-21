import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
const areas = ["chxndler_studio", "chxndler", "unreleased_song"] as const;
const taskStatuses = ["todo", "in_progress", "blocked", "done"] as const;
const priorities = ["low", "normal", "high"] as const;
async function gate() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  return null;
}

export async function GET() {
  const denied = await gate();
  if (denied) return denied;
  const db = getSupabaseAdmin();
  const { data: songs, error: songError } = await db.from("songs").select("id,title,slug").not("slug", "is", null);
  if (songError) return NextResponse.json({ error: "Unable to load unreleased songs." }, { status: 500 });
  const songRows = songs || [];
  const pageSize = 1000;
  const { data: firstPage, count, error } = await db.from("admin_tasks").select("*", { count: "exact" }).order("due_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).range(0, pageSize - 1);
  if (error) return NextResponse.json({ error: "Unable to load tasks. Apply the task tracker migration first." }, { status: 500 });
  const tasks = firstPage || [];
  for (let offset = pageSize; offset < (count || 0); offset += pageSize) {
    const { data: page, error: pageError } = await db.from("admin_tasks").select("*").order("due_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);
    if (pageError) return NextResponse.json({ error: "Unable to load all task pages." }, { status: 500 });
    tasks.push(...(page || []));
  }
  const songById = new Map(songRows.map(song => [song.id, song]));
  const allSongIds = [...new Set(tasks.map(task => task.song_id).filter(Boolean))];
  const { data: linkedSongs } = allSongIds.length ? await db.from("songs").select("id,title,slug").in("id", allSongIds) : { data: [] as Array<{id:string;title:string;slug:string}> };
  const songMap = new Map([...(linkedSongs || []), ...songById.values()].map(song => [song.id, song]));
  const contentIds = [...new Set(tasks.map(task => task.content_item_id).filter(Boolean))];
  const { data: content } = contentIds.length ? await db.from("song_content_items").select("id,song_id,title").in("id", contentIds) : { data: [] as Array<{id:string;song_id:string;title:string}> };
  const contentMap = new Map((content || []).map(item => [item.id, item]));
  return NextResponse.json({ tasks: tasks.map(task => ({ ...task, song: task.song_id ? songMap.get(task.song_id) || null : null, content: task.content_item_id ? contentMap.get(task.content_item_id) || null : null })) });
}

export async function POST(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const body = await request.json();
  if (!areas.includes(body.business_area) || typeof body.title !== "string" || !body.title.trim()) return NextResponse.json({ error: "Choose a business and enter a task title." }, { status: 400 });
  const row: Record<string, unknown> = {
    business_area: body.business_area,
    title: body.title.trim().slice(0, 180),
    description: typeof body.description === "string" ? body.description.trim().slice(0, 5000) : "",
    priority: priorities.includes(body.priority) ? body.priority : "normal",
    task_category: ["music", "editing", "admin"].includes(body.task_category) ? body.task_category : (body.business_area === "unreleased_song" ? "music" : "admin"),
    parent_task_id: typeof body.parent_task_id === "string" && /^[0-9a-f-]{36}$/i.test(body.parent_task_id) ? body.parent_task_id : null,
    due_at: typeof body.due_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due_at) ? body.due_at : null,
    song_id: null,
  };
  if (body.business_area === "unreleased_song" && (!body.song_id || typeof body.song_id !== "string")) return NextResponse.json({ error: "Choose a song for this task." }, { status: 400 });
  if (body.song_id) {
    if (typeof body.song_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.song_id)) return NextResponse.json({ error: "Choose a valid song." }, { status: 400 });
    const { data: song } = await getSupabaseAdmin().from("songs").select("id,is_released").eq("id", body.song_id).maybeSingle();
    if (!song || (body.business_area === "unreleased_song" && song.is_released)) return NextResponse.json({ error: "Choose an existing song that matches this task scope." }, { status: 400 });
    row.song_id = song.id;
  }
  const { data, error } = await getSupabaseAdmin().from("admin_tasks").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: "Unable to create task." }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function PATCH(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const body = await request.json();
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Invalid task." }, { status: 400 });
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.status === "string" && taskStatuses.includes(body.status)) update.status = body.status;
  if (["music", "editing", "admin"].includes(body.task_category)) update.task_category = body.task_category;
  if (body.parent_task_id === null || body.parent_task_id === "") update.parent_task_id = null;
  else if (typeof body.parent_task_id === "string" && /^[0-9a-f-]{36}$/i.test(body.parent_task_id)) update.parent_task_id = body.parent_task_id;
  if (typeof body.priority === "string" && priorities.includes(body.priority)) update.priority = body.priority;
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim().slice(0, 180);
  if (typeof body.description === "string") update.description = body.description.trim().slice(0, 5000);
  if (body.due_at === null || body.due_at === "") update.due_at = null;
  else if (typeof body.due_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due_at)) {
    update.due_at = body.due_at;
  }
  if (Object.keys(update).length === 1) return NextResponse.json({ error: "No valid changes provided." }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("admin_tasks").update(update).eq("id", body.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Unable to update this task." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
