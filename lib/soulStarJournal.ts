import { supabaseClient } from './supabaseClient';

export type SoulStarLogEntry = {
  entry_id: string;
  entryDate: string;
  element: string;
  soulStar: string;
  isPrivate: boolean;
  promptDate: string;
  prompt: string;
  intention: string | null;
  promptId?: string | null;
};

export type CurrentPrompt = {
  id: string;
  prompt_date: string;
  element: string;
  reflection: string; // prompt question text (was 'prompt')
  intention?: string;
};

export type SaveSoulStarEntryParams = {
  userId: string;
  currentPrompt: CurrentPrompt;
  soulStarText: string;
  isPrivate: boolean;
};

export async function saveSoulStarEntry({
  userId,
  currentPrompt,
  soulStarText,
  isPrivate
}: SaveSoulStarEntryParams) {
  const row = {
    user_id: userId,
    entry_date: currentPrompt.prompt_date,
    element: currentPrompt.element,
    prompt_id: currentPrompt.id,
    intention: currentPrompt.intention || null,
    reflection: currentPrompt.reflection || null, // prompt question text
    soul_star: soulStarText,
    is_public: !isPrivate
  };

  const { data, error } = await supabaseClient
    .from("soul_journal_entries")
    .upsert(row, { onConflict: "user_id,entry_date" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function loadSoulStarFullLog(userId: string): Promise<SoulStarLogEntry[]> {
  const { data, error } = await supabaseClient
    .from("soul_journal_entries")
    .select(`
      entry_id,
      entry_date,
      element,
      soul_star,
      is_public,
      created_at,
      prompt_id,
      intention,
      reflection,
      soul_daily_prompts (
        id,
        prompt_date,
        element,
        prompt,
        intention
      )
    `)
    .eq("user_id", userId)
    .order("entry_date", { ascending: false });

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map((entry: any) => ({
    entry_id: entry.entry_id,
    entryDate: entry.entry_date,
    element: entry.element,
    soulStar: entry.soul_star || '',
    isPrivate: !(entry.is_public ?? false),
    promptDate: entry.soul_daily_prompts?.prompt_date || entry.entry_date,
    // Use the reflection column (which stores the prompt text) or fallback to the relationship
    prompt: entry.reflection || entry.soul_daily_prompts?.prompt || '', 
    // Use the intention column (which stores the intention text) or fallback to the relationship
    intention: entry.intention || entry.soul_daily_prompts?.intention || null,
    promptId: entry.prompt_id || entry.soul_daily_prompts?.id || null,
  }));
}

export async function updateSoulStarPrivacy(entryId: string, isPrivate: boolean) {
  const { data, error } = await supabaseClient
    .from("soul_journal_entries")
    .update({ is_public: !isPrivate })
    .eq("entry_id", entryId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
