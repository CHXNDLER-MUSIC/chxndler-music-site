/**
 * @deprecated This file is DEPRECATED and should not be used.
 *
 * Secret phrase redemption now uses the `redeem_secret_phrase` RPC function
 * which handles all validation, redemption tracking, and coin awarding securely
 * on the database side. The secret_phrases table is locked down with RLS and
 * cannot be queried directly from the client.
 *
 * For frontend usage, call the RPC directly:
 *   supabase.rpc('redeem_secret_phrase', { p_phrase: trimmedPhrase })
 *
 * The RPC returns: { status, awarded, phrase_id }
 * Status values: 'success', 'already_redeemed', 'invalid', 'not_authenticated'
 */

// This file is kept for reference only. All exports have been removed.
// If you need to redeem secret phrases, use the RPC directly.