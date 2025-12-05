import { SupabaseClient } from '@supabase/supabase-js';

export type SoulJournalRow = {
  id: string;
  user_id: string;
  prompt_id: string | null;
  entry_date: string; // YYYY-MM-DD
  element: string;
  soul_star: string | null;
  is_private: boolean | null;
};

export type SoulJournalWithPrompt = {
  id: string;
  entry_date: string;
  element: string;
  soul_star: string | null;
  is_private: boolean | null;
  prompt: string | null;
  intention: string | null;
};

/**
 * Upsert a user's Soul Star journal entry for a given date + element.
 * Enforces single entry per (user_id, entry_date, element) via onConflict.
 */
export async function saveSoulStarEntry(
  supabaseClient: SupabaseClient,
  params: {
    userId: string;
    selectedElement: string;
    promptDate: string; // YYYY-MM-DD
    promptId: string | null; // references soul_daily_prompts.id
    soulStarText: string;
    isPrivate: boolean;
  }
): Promise<SoulJournalRow> {
  const { userId, selectedElement, promptDate, promptId, soulStarText, isPrivate } = params;

  const payload: Partial<SoulJournalRow> = {
    user_id: userId,
    entry_date: promptDate,
    element: selectedElement,
    prompt_id: promptId ?? null,
    soul_star: soulStarText?.trim() ?? null,
    is_private: isPrivate,
  } as any;

  const { data, error } = await supabaseClient
    .from('soul_journal_entries')
    .upsert(payload, {
      onConflict: 'user_id,entry_date',
      ignoreDuplicates: false,
    })
    .select('*')
    .single();

  if (error) {
    console.error('saveSoulStarEntry error:', error);
    throw new Error(error.message);
  }

  return data as SoulJournalRow;
}

/**
 * Load all Soul Star journal entries for a user, joined with the matching daily prompt text.
 * Ordered by entry_date DESC.
 */
export async function loadSoulStarFullLog(
  supabaseClient: SupabaseClient,
  userId: string
): Promise<SoulJournalWithPrompt[]> {
  // Join on prompt_id -> soul_daily_prompts to get prompt and intention
  const { data, error } = await supabaseClient
    .from('soul_journal_entries')
    .select(
      `id, entry_date, element, soul_star, is_private,
       soul_daily_prompts:prompt_id (prompt, intention)`
    )
    .eq('user_id', userId)
    .order('entry_date', { ascending: false });

  if (error) {
    console.error('loadSoulStarFullLog error:', error);
    throw new Error(error.message);
  }

  const mapped: SoulJournalWithPrompt[] = (data || []).map((row: any) => ({
    id: row.id,
    entry_date: row.entry_date,
    element: row.element,
    soul_star: row.soul_star ?? null,
    is_private: row.is_private ?? false,
    prompt: row.soul_daily_prompts?.prompt ?? null,
    intention: row.soul_daily_prompts?.intention ?? null,
  }));

  return mapped;
}

// Convenience wrappers using the default browser client
import { supabaseClient as defaultClient } from '@/lib/supabaseClient';

export async function saveSoulStarEntryDefault(
  userId: string,
  selectedElement: string,
  promptDate: string,
  promptId: string | null,
  soulStarText: string,
  isPrivate: boolean
) {
  return saveSoulStarEntry(defaultClient, {
    userId,
    selectedElement,
    promptDate,
    promptId,
    soulStarText,
    isPrivate,
  });
}

export async function loadSoulStarFullLogDefault(userId: string) {
  return loadSoulStarFullLog(defaultClient, userId);
}
