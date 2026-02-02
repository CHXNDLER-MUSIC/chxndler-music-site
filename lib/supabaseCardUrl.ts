/**
 * Supabase Storage public URL builder for card images.
 *
 * The bucket "cards" is public — no auth keys needed.
 * All card filenames are UPPERCASE .webp on Supabase Storage.
 */

export const SUPABASE_CARDS_BASE_URL =
  "https://hjpaiolhhugwzblarfix.supabase.co/storage/v1/object/public/cards";

/**
 * Build a public Supabase Storage URL for a card image.
 *
 * @param cardKey — card name such as "ALONE", "Alone", "alone", "BACK", etc.
 *   If cardKey is already a full URL (starts with "http"), it is returned as-is.
 *   The key is trimmed, uppercased, and percent-encoded so spaces,
 *   parentheses, and other special characters resolve correctly.
 */
export function getCardImageUrl(cardKey: string): string {
  if (!cardKey) return `${SUPABASE_CARDS_BASE_URL}/${encodeURIComponent("CHXNDLER")}.webp`;
  if (cardKey.startsWith("http")) return cardKey;
  const key = String(cardKey).trim().toUpperCase();
  return `${SUPABASE_CARDS_BASE_URL}/${encodeURIComponent(key)}.webp`;
}
