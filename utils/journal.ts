import { SupabaseClient } from '@supabase/supabase-js';

export interface JournalEntry {
  id?: string;
  user_id: string;
  entry_date: string;
  intention?: string;
  reflection?: string;
  entry_text?: string;
  created_at?: string;
}

export async function fetchTodaysJournalEntry(
  supabaseClient: SupabaseClient,
  userId: string
): Promise<JournalEntry | null> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabaseClient
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_date', today)
    .maybeSingle();

  if (error) {
    console.error('Error fetching journal entry:', error);
    throw new Error(`Failed to fetch journal entry: ${error.message}`);
  }

  return data;
}

export async function upsertJournalEntry(
  supabaseClient: SupabaseClient,
  userId: string,
  entry: {
    intention?: string;
    reflection?: string;
    entry_text?: string;
  }
): Promise<JournalEntry> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabaseClient
    .from('journal_entries')
    .upsert({
      user_id: userId,
      entry_date: today,
      intention: entry.intention?.trim() || null,
      reflection: entry.reflection?.trim() || null,
      entry_text: entry.entry_text?.trim() || null,
    }, {
      onConflict: 'user_id,entry_date'
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting journal entry:', error);
    throw new Error(`Failed to save journal entry: ${error.message}`);
  }

  return data;
}