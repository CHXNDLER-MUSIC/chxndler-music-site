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
    console.log('Starting ensureTodaySoulPrompt...');
    const supabase = getSupabaseAdmin();
    console.log('Supabase admin client created');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check if there's already a row for today
    console.log('Checking for existing daily prompt for:', today);
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
    
    console.log('Existing daily check result:', { existingDaily, existingError });

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
    // Get all prompts first
    const { data: allPrompts, error: allPromptsError } = await supabase
      .from('soul_prompts')
      .select('id, element, intention, reflection, created_at');

    if (allPromptsError) {
      console.error('Error fetching all prompts:', allPromptsError);
      throw allPromptsError;
    }

    // Get all used prompt IDs
    const { data: usedPrompts, error: usedError } = await supabase
      .from('soul_daily_prompts')
      .select('prompt_id')
      .not('prompt_id', 'is', null);

    if (usedError) {
      console.error('Error fetching used prompts:', usedError);
      throw usedError;
    }

    const usedPromptIds = new Set(usedPrompts?.map(p => p.prompt_id) || []);
    const unusedPrompts = allPrompts?.filter(prompt => !usedPromptIds.has(prompt.id)) || [];

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