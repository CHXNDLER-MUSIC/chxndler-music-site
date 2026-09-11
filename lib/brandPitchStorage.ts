/**
 * Supabase Storage public URL builders for the brand-pitch system.
 *
 * Audio and art both live in the single public "Brands" bucket, under a
 * per-brand/per-song folder (e.g. "Oatly/WOW NO COW/AUDIO/…",
 * "Oatly/WOW NO COW/PHOTO/…") — use the exact bucket/folder names as
 * created in Supabase Storage (case and spacing both matter).
 * Uses supabase-js storage.getPublicUrl() rather than hand-building URLs.
 */
import { supabaseBrowser } from "@/lib/supabase-browser";

const BRAND_BUCKET = "Brands";

function publicUrl(bucket: string, path: string | null | undefined): string | null {
  const clean = (path || "").trim();
  if (!clean) return null;
  const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(clean);
  return data?.publicUrl || null;
}

/** Build a public URL for a brand audio object path (e.g. "Oatly/WOW NO COW/AUDIO/WOW NO COW (30 sec).wav"). */
export function getBrandTrackUrl(path: string | null | undefined): string | null {
  return publicUrl(BRAND_BUCKET, path);
}

/** Build a public URL for a brand artwork object path (e.g. "Oatly/WOW NO COW/PHOTO/cover art.png"). */
export function getBrandArtUrl(path: string | null | undefined): string | null {
  return publicUrl(BRAND_BUCKET, path);
}
