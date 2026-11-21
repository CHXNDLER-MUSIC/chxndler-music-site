import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const validId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
async function gate() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();
  return null;
}

export async function PATCH(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const body = await request.json();
  if (!validId(body.id)) return NextResponse.json({ error: "Invalid content item." }, { status: 400 });
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of ["recorded", "edited", "published"] as const) {
    if (field in body) {
      if (typeof body[field] !== "boolean") return NextResponse.json({ error: `Invalid ${field} value.` }, { status: 400 });
      update[field] = body[field];
      if (body[field] === true) {
        const dateField = field === "recorded" ? "recorded_at" : field === "edited" ? "edited_at" : "published_at";
        const { data: current } = await getSupabaseAdmin().from("content_items").select(dateField).eq("id", body.id).maybeSingle();
        if (current && !current[dateField]) update[dateField] = new Date().toISOString();
      }
    }
  }
  if ("content_order" in body) {
    if (!Number.isInteger(body.content_order) || body.content_order < 0 || body.content_order > 100000) return NextResponse.json({ error: "Invalid content order." }, { status: 400 });
    update.content_order = body.content_order;
  }
  if (Object.keys(update).length === 1) return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("content_items").update(update).eq("id", body.id).select("id,song_id,recorded,edited,published,content_order").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Unable to update this checklist item." }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const denied = await gate();
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id");
  if (!validId(id)) return NextResponse.json({ error: "Invalid content item." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("content_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Unable to remove this checklist item." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
