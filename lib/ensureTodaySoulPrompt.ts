import { getSupabaseAdmin } from './supabaseServer';

export interface SoulPrompt {
  id: number;
  prompt_date: string;
  element: string;
  intention: string;
  reflection: string;
  created_at: string;
}

export interface ExhaustedStatus {
  status: "exhausted";
}

export type EnsureTodayResult = SoulPrompt | ExhaustedStatus;

export async function ensureTodaySoulPrompt(): Promise<EnsureTodayResult> {
  try {
    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check if there's already a row for today
    const { data: existingDaily, error: existingError } = await supabase
      .from('soul_daily_prompts')
      .select(`
        id,
        prompt_date,
        prompt_id,
        created_at,
        soul_prompts (
          id,
          element,
          intention,
          reflection,
          created_at
        )
      `)
      .eq('prompt_date', today)
      .single();

    if (existingDaily && existingDaily.soul_prompts) {
      // Return existing daily prompt with its related soul_prompts data
      return {
        id: existingDaily.id,
        prompt_date: existingDaily.prompt_date,
        element: existingDaily.soul_prompts.element,
        intention: existingDaily.soul_prompts.intention,
        reflection: existingDaily.soul_prompts.reflection,
        created_at: existingDaily.created_at,
      };
    }

    // No row for today yet, find an unused prompt
    const { data: unusedPrompts, error: unusedError } = await supabase
      .from('soul_prompts')
      .select('id, element, intention, reflection, created_at')
      .not('id', 'in', `(
        SELECT prompt_id 
        FROM soul_daily_prompts 
        WHERE prompt_id IS NOT NULL
      )`);

    if (unusedError) {
      console.error('Error fetching unused prompts:', unusedError);
      throw unusedError;
    }

    if (!unusedPrompts || unusedPrompts.length === 0) {
      // No prompts remain
      return { status: "exhausted" };
    }

    // Randomly pick one unused prompt
    const randomIndex = Math.floor(Math.random() * unusedPrompts.length);
    const selectedPrompt = unusedPrompts[randomIndex];

    // Insert into soul_daily_prompts
    const { data: newDaily, error: insertError } = await supabase
      .from('soul_daily_prompts')
      .insert({
        prompt_date: today,
        prompt_id: selectedPrompt.id,
        element: selectedPrompt.element,
      })
      .select('id, prompt_date, created_at')
      .single();

    if (insertError) {
      console.error('Error inserting daily prompt:', insertError);
      throw insertError;
    }

    // Return the newly created daily prompt with its prompt data
    return {
      id: newDaily.id,
      prompt_date: newDaily.prompt_date,
      element: selectedPrompt.element,
      intention: selectedPrompt.intention,
      reflection: selectedPrompt.reflection,
      created_at: newDaily.created_at,
    };

  } catch (error) {
    console.error('Error in ensureTodaySoulPrompt:', error);
    throw error;
  }
}