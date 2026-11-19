/**
 * Route audio through the server so private catalog tracks can be authorized
 * before a short-lived Supabase URL is issued.
 */

/** Build a same-origin authorized audio URL. */
export function supabaseTrackUrl(filename: string): string {
  return `/api/audio?path=${encodeURIComponent(filename)}`;
}
