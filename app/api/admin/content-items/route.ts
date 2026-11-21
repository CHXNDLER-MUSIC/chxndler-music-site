import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const fields = "id,source_row,legacy_x5,title,category,sub_category,song_name,song_id,canonical_song_title,song_link_status,recorded,edited,post_ready,media_type,purpose,source_url,media_url,script,planned_date,planned_time,caption,text_on_screen,hidden,hashtags,legacy_date_time,editor,legacy_minutes,published,legacy_posted_raw,is_placeholder_date,is_sample,workflow_status,workflow_priority,recorded_at,edited_at,published_at,platform,music_video_project_id,is_reportable,music_video_status,music_video_next_action,content_template_key,content_order,created_at,updated_at";
const textFields = new Set(["title", "category", "sub_category", "song_name", "media_type", "purpose", "source_url", "media_url", "script", "planned_time", "caption", "text_on_screen", "hashtags", "legacy_date_time", "editor", "legacy_minutes", "platform"]);
const timestampFields = new Set(["recorded_at", "edited_at", "published_at"]);
const booleanFields = new Set(["recorded", "edited", "post_ready", "published", "hidden", "legacy_x5"]);
const editableFields = new Set([...textFields, ...booleanFields, ...timestampFields, "planned_date", "song_id", "content_order"]);
const validId = (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
const sanitizeSearch = (value: string) => value.trim().slice(0, 100).replace(/[%,()\\.*]/g, " ").replace(/\s+/g, " ").trim();

async function gate() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  return null;
}

function applyFilters(query: any, params: URLSearchParams) {
  const songId = params.get("songId");
  const category = params.get("category");
  const mediaType = params.get("type");
  const title = params.get("title");
  const songName = params.get("songName");
  const subCategory = params.get("subCategory");
  const plannedDate = params.get("plannedDate");
  const workflow = params.get("workflow");
  const recorded = params.get("recorded");
  const edited = params.get("edited");
  const postReady = params.get("post_ready");
  const search = sanitizeSearch(params.get("q") || "");
  if (songId && validId(songId)) query = query.eq("song_id", songId);
  if (category) query = query.eq("category", category.slice(0, 80));
  if (mediaType) query = query.eq("media_type", mediaType.slice(0, 80));
  if (title) query = query.eq("title", title.slice(0, 200));
  if (songName) query = query.ilike("song_name", songName.slice(0, 120));
  if (subCategory) query = query.eq("sub_category", subCategory.slice(0, 100));
  if (plannedDate) query = query.eq("planned_date", plannedDate.slice(0, 20));
  if (workflow === "Needs Action") query = query.in("workflow_status", ["Idea", "To Record", "To Edit", "Ready"]);
  else if (workflow === "Ready to Post") query = query.eq("workflow_status", "Ready");
  else if (["Idea", "To Record", "To Edit", "Ready", "Scheduled", "Posted", "Music Video"].includes(workflow || "")) query = query.eq("workflow_status", workflow);
  if (recorded === "true" || recorded === "false") query = query.eq("recorded", recorded === "true");
  if (edited === "true" || edited === "false") query = query.eq("edited", edited === "true");
  if (postReady === "true" || postReady === "false") query = query.eq("post_ready", postReady === "true");
  if (search) {
    const term = `%${search}%`;
    query = query.or(`title.ilike.${term},song_name.ilike.${term},canonical_song_title.ilike.${term},category.ilike.${term},sub_category.ilike.${term},caption.ilike.${term},hashtags.ilike.${term}`);
  }
  return query;
}

export async function GET(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const db = getSupabaseAdmin();
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(params.get("pageSize") || "50", 10) || 50));
  const from = (page - 1) * pageSize;
  const sort = params.get("sort") || "planned_date";
  const sortColumn = ["title", "song_name", "canonical_song_title", "category", "media_type", "planned_date", "workflow_status", "workflow_priority", "recorded", "edited", "post_ready", "content_order"].includes(sort) ? sort : "workflow_priority";
  const ascending = params.get("direction") === "asc";

  let pageQuery = applyFilters(db.from("content_items_library").select(fields, { count: "exact" }), params)
    .order(sortColumn, { ascending, nullsFirst: false }).order("source_row", { ascending: true }).range(from, from + pageSize - 1);
  const [{ data, error, count }, { data: songs, error: songsError }, { data: facets, error: facetsError }] = await Promise.all([
    pageQuery,
    db.from("songs").select("id,title,slug").order("title", { ascending: true }),
    db.from("content_items").select("title,song_name,category,sub_category,media_type,planned_date").order("source_row", { ascending: true }).range(0, 999),
  ]);
  if (error) return NextResponse.json({ error: `Unable to load content. Apply the unified content library migration first. ${error.message}` }, { status: 503 });
  if (songsError) return NextResponse.json({ error: `Unable to load canonical songs: ${songsError.message}` }, { status: 500 });
  if (facetsError) return NextResponse.json({ error: `Unable to load content filters: ${facetsError.message}` }, { status: 500 });

  const countFor = async (predicate?: (query: any) => any) => {
    let query = db.from("content_items_library").select("id", { count: "exact", head: true }).eq("is_reportable", true);
    if (predicate) query = predicate(query);
    const result = await query;
    return result.error ? null : result.count || 0;
  };
  const [total, recordedCount, editedCount, toRecord, toEdit, ready, scheduled, posted] = await Promise.all([
    countFor(),
    countFor(query => query.eq("recorded", true)),
    countFor(query => query.eq("edited", true)),
    countFor(query => query.eq("workflow_status", "To Record")),
    countFor(query => query.eq("workflow_status", "To Edit")),
    countFor(query => query.eq("workflow_status", "Ready")),
    countFor(query => query.eq("workflow_status", "Scheduled")),
    countFor(query => query.eq("workflow_status", "Posted")),
  ]);

  let songSummary: { total: number; recorded: number; edited: number; posted: number; formats: Array<{ name: string; count: number }> } | null = null;
  const songId = params.get("songId");
  if (songId && validId(songId)) {
    const perSong = await db.from("content_items_library").select("category,sub_category,media_type,workflow_status,recorded,edited,published", { count: "exact" }).eq("song_id", songId).eq("is_reportable", true).order("source_row", { ascending: true });
    if (perSong.error) return NextResponse.json({ error: `Unable to load song content summary: ${perSong.error.message}` }, { status: 503 });
    const grouped = new Map<string, number>();
    for (const item of perSong.data || []) {
      const format = [item.media_type, item.sub_category, item.category].find(value => typeof value === "string" && value.trim()) || "Other / uncategorized";
      grouped.set(format, (grouped.get(format) || 0) + 1);
    }
    const rows = perSong.data || [];
    songSummary = {
      total: perSong.count || 0,
      recorded: rows.filter(item => item.recorded === true).length,
      edited: rows.filter(item => item.edited === true).length,
      posted: rows.filter(item => item.published === true).length,
      formats: [...grouped.entries()].map(([name, value]) => ({ name, count: value })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    };
  }

  return NextResponse.json({
    items: data || [], total: count || 0, page, pageSize,
    metrics: { total, recorded: recordedCount, edited: editedCount, toRecord, toEdit, ready, scheduled, posted },
    songs: songs || [], categories: [...new Set((facets || []).map(row => row.category).filter((value): value is string => !!value))].sort(),
    types: [...new Set((facets || []).map(row => row.media_type).filter((value): value is string => !!value))].sort(),
    suggestions: {
      titles: [...new Set((facets || []).map(row => row.title).filter((value): value is string => !!value))].sort(),
      songs: [...new Set((facets || []).map(row => row.song_name).filter((value): value is string => !!value))].sort(),
      categories: [...new Set((facets || []).map(row => row.category).filter((value): value is string => !!value))].sort(),
      subCategories: [...new Set((facets || []).map(row => row.sub_category).filter((value): value is string => !!value))].sort(),
      types: [...new Set((facets || []).map(row => row.media_type).filter((value): value is string => !!value))].sort(),
      dates: [...new Set((facets || []).map(row => row.planned_date).filter((value): value is string => !!value))].sort(),
    }, songSummary,
  });
}

export async function POST(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const body = await request.json();
  const db = getSupabaseAdmin();
  const payload = normalizePayload(body, false);
  if (payload instanceof NextResponse) return payload;
  if (payload.song_id) {
    const { data: song } = await db.from("songs").select("id,title").eq("id", payload.song_id).maybeSingle();
    if (!song) return NextResponse.json({ error: "Choose a song from the catalog." }, { status: 400 });
    if (!payload.song_name) payload.song_name = song.title;
  }
  const { data, error } = await db.from("content_items").insert(payload).select("id").single();
  if (error || !data) return NextResponse.json({ error: `Unable to create content: ${error?.message || "No row returned."}` }, { status: 500 });
  const item = await db.from("content_items_library").select(fields).eq("id", data.id).single();
  if (item.error) return NextResponse.json({ error: `Content saved but could not be reloaded: ${item.error.message}` }, { status: 500 });
  return NextResponse.json({ item: item.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const body = await request.json();
  if (!validId(body.id)) return NextResponse.json({ error: "Invalid content item." }, { status: 400 });
  const db = getSupabaseAdmin();
  const payload = normalizePayload(body, true);
  if (payload instanceof NextResponse) return payload;
  if (payload.song_id) {
    const { data: song } = await db.from("songs").select("id,title").eq("id", payload.song_id).maybeSingle();
    if (!song) return NextResponse.json({ error: "Choose a song from the catalog." }, { status: 400 });
    if (typeof body.song_name !== "string") payload.song_name = song.title;
  }
  payload.updated_at = new Date().toISOString();
  const { error } = await db.from("content_items").update(payload).eq("id", body.id);
  if (error) return NextResponse.json({ error: `Unable to save content: ${error.message}` }, { status: 500 });
  const { data, error: readError } = await db.from("content_items_library").select(fields).eq("id", body.id).single();
  if (readError || !data) return NextResponse.json({ error: `Content saved but could not be reloaded: ${readError?.message || "Not found."}` }, { status: 500 });
  return NextResponse.json({ item: data });
}

function normalizePayload(body: Record<string, unknown>, partial: boolean): Record<string, any> | NextResponse {
  const result: Record<string, any> = {};
  for (const key of editableFields) {
    if (!(key in body)) continue;
    const value = body[key];
    if (textFields.has(key)) {
      if (value !== null && typeof value !== "string") return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
      result[key] = typeof value === "string" ? value.trim().slice(0, key === "script" || key === "caption" || key === "hashtags" ? 12000 : 4000) || null : null;
    } else if (booleanFields.has(key)) {
      if (typeof value !== "boolean" && value !== null) return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
      result[key] = value;
    } else if (timestampFields.has(key)) {
      if (value !== null && (typeof value !== "string" || Number.isNaN(Date.parse(value)))) return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
      result[key] = value || null;
    } else if (key === "planned_date") {
      if (value !== null && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))) return NextResponse.json({ error: "Use a valid planned date." }, { status: 400 });
      result[key] = value || null;
      if ("is_placeholder_date" in body) result.is_placeholder_date = body.is_placeholder_date === true;
      else if (!partial) result.is_placeholder_date = false;
    } else if (key === "song_id") {
      if (value !== null && !validId(value)) return NextResponse.json({ error: "Choose a valid song." }, { status: 400 });
      result[key] = value;
    } else if (key === "content_order") {
      if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 100000) return NextResponse.json({ error: "Invalid content order." }, { status: 400 });
      result[key] = value;
    }
  }
  if (!partial) {
    if (typeof body.title !== "string" || !body.title.trim()) return NextResponse.json({ error: "Enter a content title." }, { status: 400 });
    result.title = body.title.trim().slice(0, 500);
  } else if ("title" in body && (typeof body.title !== "string" || !body.title.trim())) {
    return NextResponse.json({ error: "Content title cannot be blank." }, { status: 400 });
  }
  if ("title" in body && partial) result.title = String(body.title).trim().slice(0, 500);
  if (!partial && !("planned_date" in body)) result.planned_date = null;
  if (!partial && !("song_id" in body)) result.song_id = null;
  if (!partial && !("recorded" in body)) result.recorded = false;
  if (!partial && !("edited" in body)) result.edited = false;
  if (!partial && !("post_ready" in body)) result.post_ready = false;
  if (!partial && !("published" in body)) result.published = false;
  if (!partial && !("hidden" in body)) result.hidden = false;
  return result;
}
