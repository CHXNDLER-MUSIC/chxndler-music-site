/**
 * Supabase Storage public URL builder for audio tracks.
 *
 * The bucket "tracks" is public — no auth keys needed for playback.
 * Filenames are percent-encoded so spaces, parentheses, and other
 * special characters resolve correctly.
 */

const SUPABASE_STORAGE_URL =
  "https://hjpaiolhhugwzblarfix.supabase.co/storage/v1/object/public/tracks";

/** Build a public Supabase Storage URL for a track file. */
export function supabaseTrackUrl(filename: string): string {
  return `${SUPABASE_STORAGE_URL}/${encodeURIComponent(filename)}`;
}
