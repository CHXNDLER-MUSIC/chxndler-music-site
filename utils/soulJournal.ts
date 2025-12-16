import { SupabaseClient } from '@supabase/supabase-js';

export type SoulJournalRow = {
  entry_id: string;
  user_id: string;
  prompt_id: string | null;
  entry_date: string; // YYYY-MM-DD
  element: string;
  intention: string | null;
  reflection: string | null; // prompt question text (was 'prompt')
  intention_response: string | null;
  reflection_response: string | null;
  entry_text: string | null; // user's written reflection text
  is_public: boolean | null;
};

export type SoulJournalWithPrompt = {
  entry_id: string;
  entry_date: string;
  element: string;
  entry_text: string | null; // user's written reflection text
  is_private: boolean | null;
  reflection: string | null; // prompt question text (was 'prompt')
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
    intention: string | null; // from daily prompt
    reflection: string | null; // prompt question text (was 'prompt')
    entryText: string; // user's written reflection
    isPrivate: boolean;
  }
): Promise<SoulJournalRow> {
  const { userId, selectedElement, promptDate, promptId, intention, reflection, entryText, isPrivate } = params;

  const payload: Partial<SoulJournalRow> = {
    user_id: userId,
    entry_date: promptDate,
    element: selectedElement,
    prompt_id: promptId ?? null,
    intention: intention ?? null,
    reflection: reflection ?? null, // prompt question text
    entry_text: entryText?.trim() ?? null, // user's written reflection
    is_public: !isPrivate,
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
      `entry_id, entry_date, element, entry_text, is_public,
       soul_daily_prompts:prompt_id (prompt, intention)`
    )
    .eq('user_id', userId)
    .order('entry_date', { ascending: false });

  if (error) {
    console.error('loadSoulStarFullLog error:', error);
    throw new Error(error.message);
  }

  const mapped: SoulJournalWithPrompt[] = (data || []).map((row: any) => ({
    entry_id: row.entry_id,
    entry_date: row.entry_date,
    element: row.element,
    entry_text: row.entry_text ?? null, // user's written reflection text
    is_private: !(row.is_public ?? false),
    reflection: row.soul_daily_prompts?.prompt ?? null, // prompt question text
    intention: row.soul_daily_prompts?.intention ?? null,
  }));

  return mapped;
}

// Convenience wrappers using the default browser client
import { supabaseBrowser as defaultClient } from '@/lib/supabase-browser';

export async function saveSoulStarEntryDefault(
  userId: string,
  selectedElement: string,
  promptDate: string,
  promptId: string | null,
  intention: string | null,
  reflection: string | null,
  entryText: string,
  isPrivate: boolean
) {
  return saveSoulStarEntry(defaultClient, {
    userId,
    selectedElement,
    promptDate,
    promptId,
    intention,
    reflection,
    entryText,
    isPrivate,
  });
}

export async function loadSoulStarFullLogDefault(userId: string) {
  return loadSoulStarFullLog(defaultClient, userId);
}
