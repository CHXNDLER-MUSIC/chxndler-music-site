import { supabaseClient } from './supabaseClient';

export type SoulStarLogEntry = {
  id: string;
  entryDate: string;
  element: string;
  soulStar: string;
  isPrivate: boolean;
  promptDate: string;
  prompt: string;
  intention: string | null;
};

export type CurrentPrompt = {
  id: string;
  prompt_date: string;
  element: string;
  prompt: string;
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
    prompt_id: currentPrompt.id,
    entry_date: currentPrompt.prompt_date,
    element: currentPrompt.element,
    soul_star: soulStarText,
    is_private: isPrivate,
  };

  const { data, error } = await supabaseClient
    .from("soul_journal_entries")
    .upsert(row, { onConflict: "user_id,prompt_id" })
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
      id,
      entry_date,
      element,
      soul_star,
      is_private,
      created_at,
      soul_daily_prompts (
        prompt_date,
        element,
        reflection,
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
    id: entry.id,
    entryDate: entry.entry_date,
    element: entry.element,
    soulStar: entry.soul_star,
    isPrivate: entry.is_private,
    promptDate: entry.soul_daily_prompts?.prompt_date || entry.entry_date,
    prompt: entry.soul_daily_prompts?.reflection || '',
    intention: entry.soul_daily_prompts?.intention || null,
  }));
}

export async function updateSoulStarPrivacy(entryId: string, isPrivate: boolean) {
  const { data, error } = await supabaseClient
    .from("soul_journal_entries")
    .update({ is_private: isPrivate })
    .eq("id", entryId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}