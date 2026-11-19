import { NextResponse } from "next/server";
import { getApiUser, isAdminUser, unauthorized, forbidden } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await getApiUser();
  if (!auth) return unauthorized();
  if (!isAdminUser(auth.user)) return forbidden();

  const { data, error } = await getSupabaseAdmin()
    .from("content_items")
    .select("id,source_row,legacy_x5,title,category,sub_category,song_name,recorded,edited,post_ready,media_type,purpose,source_url,media_url,script,planned_date,planned_time,caption,text_on_screen,hidden,hashtags,legacy_date_time,editor,legacy_minutes,published,is_placeholder_date,is_sample")
    .order("source_row", { ascending: true });

  if (error) return NextResponse.json({ error: `Unable to load content items: ${error.message}` }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}
