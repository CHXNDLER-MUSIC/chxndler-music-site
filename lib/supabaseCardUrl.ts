/**
 * Supabase Storage public URL builder for card images.
 *
 * The bucket "cards" is public — no auth keys needed.
 * All card filenames are UPPERCASE .webp on Supabase Storage.
 */

export const SUPABASE_CARDS_BASE_URL =
  "https://hjpaiolhhugwzblarfix.supabase.co/storage/v1/object/public/cards";

/**
 * Safely encode a Supabase Storage object path.
 * Each path segment is percent-encoded individually so that
 * slashes are preserved while spaces, parentheses, and other
 * special characters are escaped.
 */
export function encodeSupabasePath(path: string): string {
  return path.split("/").map(s => encodeURIComponent(s).replace(/'/g, "%27")).join("/");
}

/**
 * Build a public Supabase Storage URL for a card image.
 *
 * @param cardKey — card name such as "ALONE", "Alone", "alone", "BACK", etc.
 *   If cardKey is already a full URL (starts with "http"), it is returned as-is.
 *   The key is trimmed, uppercased, and percent-encoded so spaces,
 *   parentheses, and other special characters resolve correctly.
 */
const FILENAME_OVERRIDES: Record<string, string> = {
  "HOUSE PARTY (ACOUSTIC)": "HOUSE PARTY (Acoustic)",
  "WE'RE JUST FRIENDS (MICKEY JAS REMIX)": "WE'RE JUST FRIENDS (mickey jas REMIX)",
  "WE'RE JUST FRIENDS (DMVRCO REMIX)": "were-just-friends-dmvcrco-remix",
  "WE'RE JUST FRIENDS (ACOUSTIC)": "WERE-JUST-FRIENDS-ACOUSTIC",
  "WE'RE JUST FRIENDS": "were-just-friends",
  "MAKE BELIEVE": "make believe",
  "WHAT'S MY AGE AGAIN?": "WHATS MY AGE AGAIN",
  "SUGAR, WE'RE GOING DOWN": "SUGAR WE'RE GOING DOWN",
  "AM I PRETTY WHEN I CRY?": "AM I PRETTY WHEN I CRY",
  "AM I PRETTY WHEN I CRY? (ACOUSTIC)": "AM I PRETTY WHEN I CRY (ACOUSTIC)",
  "AM I PRETTY WHEN I CRY (ACOUSTIC)?": "AM I PRETTY WHEN I CRY (ACOUSTIC)",
};

export function getCardImageUrl(cardKey: string): string {
  if (!cardKey) return `${SUPABASE_CARDS_BASE_URL}/${encodeSupabasePath("CHXNDLER")}.webp`;
  if (cardKey.startsWith("http")) return cardKey;
  const normalized = String(cardKey).trim()
    .replace(/[‘’ʼ`]/g, "'")
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const filename = FILENAME_OVERRIDES[normalized] ?? normalized;
  return `${SUPABASE_CARDS_BASE_URL}/${encodeSupabasePath(filename)}.webp`;
}
