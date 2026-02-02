import { supabaseBrowser } from '@/lib/supabase-browser';

/**
 * Strict UUID regex — validates version (1-5) and variant (8/9/a/b) bits.
 * Case-insensitive.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns true if `value` is a well-formed UUID (v1–v5).
 */
export function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return UUID_REGEX.test(value);
}

// ─── Starter card cache ────────────────────────────────────────────────
let _starterCardId: string | null = null;
let _starterCardPromise: Promise<string | null> | null = null;

/**
 * Fetch the canonical starter card ID from Supabase.
 * Result is cached in-memory for the lifetime of the page.
 * Returns `null` if no starter card row exists.
 */
export async function fetchStarterCardId(): Promise<string | null> {
  // Return cached value immediately if available
  if (_starterCardId) return _starterCardId;

  // Dedupe concurrent calls
  if (_starterCardPromise) return _starterCardPromise;

  _starterCardPromise = (async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from('cards')
        .select('id')
        .eq('is_starter', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[cardUtils] Failed to fetch starter card:', error.message);
        return null;
      }

      const id = data?.id ?? null;

      if (id && isValidUuid(id)) {
        _starterCardId = id;
      } else if (id) {
        console.error('[cardUtils] Starter card ID from DB is not a valid UUID:', id);
        return null;
      }

      return _starterCardId;
    } catch (err) {
      console.error('[cardUtils] Unexpected error fetching starter card:', err);
      return null;
    } finally {
      _starterCardPromise = null;
    }
  })();

  return _starterCardPromise;
}

/**
 * Reset the in-memory starter card cache.
 * Useful after data migrations or in tests.
 */
export function clearStarterCardCache(): void {
  _starterCardId = null;
  _starterCardPromise = null;
}
