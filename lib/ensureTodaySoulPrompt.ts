import { getSupabaseAdmin } from './supabaseServer';

export interface SoulPrompt {
  id: string;
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
    
    // Check if service role key is available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not available, daily prompts may not work properly');
      return { status: "exhausted" };
    }
    
    const supabase = getSupabaseAdmin();
    console.log('Supabase admin client created');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check if there's already a row for today
    console.log('Checking for existing daily prompt for:', today);
    const { data: existingDaily, error: existingError } = await supabase
      .from('soul_daily_prompts')
      .select('*')
      .eq('prompt_date', today)
      .single();
    
    console.log('Existing daily check result:', { existingDaily, existingError });

    if (existingDaily && !existingError) {
      // Get the intention and reflection prompts for this daily prompt
      const { data: intentionPrompt, error: intentionError } = await supabase
        .from('soul_prompts')
        .select('text')
        .eq('id', existingDaily.intention_prompt_id)
        .single();

      const { data: reflectionPrompt, error: reflectionError } = await supabase
        .from('soul_prompts')
        .select('text')
        .eq('id', existingDaily.reflection_prompt_id)
        .single();

      if (!intentionError && !reflectionError && intentionPrompt && reflectionPrompt) {
        return {
          id: existingDaily.id,
          prompt_date: existingDaily.prompt_date,
          element: existingDaily.element,
          intention: intentionPrompt.text,
          reflection: reflectionPrompt.text,
          created_at: existingDaily.created_at,
        };
      }
    }

    // No row for today yet, find unused prompts
    console.log('No existing daily prompt, fetching available prompts...');
    
    // Get all used prompt IDs from daily prompts
    console.log('Fetching used prompt IDs...');
    const { data: usedDailyPrompts, error: usedError } = await supabase
      .from('soul_daily_prompts')
      .select('intention_prompt_id, reflection_prompt_id');

    console.log('Used prompts query result:', { usedCount: usedDailyPrompts?.length, usedError });

    if (usedError) {
      console.error('Error fetching used prompts:', usedError);
      throw usedError;
    }

    const usedPromptIds = new Set();
    usedDailyPrompts?.forEach(daily => {
      if (daily.intention_prompt_id) usedPromptIds.add(daily.intention_prompt_id);
      if (daily.reflection_prompt_id) usedPromptIds.add(daily.reflection_prompt_id);
    });

    // Get all available intention prompts for all elements
    const { data: intentionPrompts, error: intentionError } = await supabase
      .from('soul_prompts')
      .select('id, element, text')
      .eq('prompt_type', 'intention');

    if (intentionError) {
      console.error('Error fetching intention prompts:', intentionError);
      throw intentionError;
    }

    // Get all available reflection prompts for all elements  
    const { data: reflectionPrompts, error: reflectionError } = await supabase
      .from('soul_prompts')
      .select('id, element, text')
      .eq('prompt_type', 'reflection');

    if (reflectionError) {
      console.error('Error fetching reflection prompts:', reflectionError);
      throw reflectionError;
    }

    // Filter out used prompts
    const availableIntentions = intentionPrompts?.filter(p => !usedPromptIds.has(p.id)) || [];
    const availableReflections = reflectionPrompts?.filter(p => !usedPromptIds.has(p.id)) || [];

    console.log('Available prompts:', { 
      intentionCount: availableIntentions.length,
      reflectionCount: availableReflections.length 
    });

    if (availableIntentions.length === 0 || availableReflections.length === 0) {
      return { status: "exhausted" };
    }

    // Pick a random element
    const elements = ['heart', 'water', 'lightning', 'darkness'];
    const selectedElement = elements[Math.floor(Math.random() * elements.length)];

    // Find available prompts for the selected element
    const elementIntentions = availableIntentions.filter(p => p.element === selectedElement);
    const elementReflections = availableReflections.filter(p => p.element === selectedElement);

    if (elementIntentions.length === 0 || elementReflections.length === 0) {
      // If no prompts for this element, use any available prompts
      const fallbackIntention = availableIntentions[Math.floor(Math.random() * availableIntentions.length)];
      const fallbackReflection = availableReflections[Math.floor(Math.random() * availableReflections.length)];

      // Insert into soul_daily_prompts
      const { data: newDaily, error: insertError } = await supabase
        .from('soul_daily_prompts')
        .insert({
          prompt_date: today,
          element: fallbackIntention.element, // Use the intention's element
          intention_prompt_id: fallbackIntention.id,
          reflection_prompt_id: fallbackReflection.id,
        })
        .select('id, prompt_date, element, created_at')
        .single();

      if (insertError) {
        console.error('Error inserting daily prompt:', insertError);
        throw insertError;
      }

      return {
        id: newDaily.id,
        prompt_date: newDaily.prompt_date,
        element: newDaily.element,
        intention: fallbackIntention.text,
        reflection: fallbackReflection.text,
        created_at: newDaily.created_at,
      };
    }

    // Select random prompts from the chosen element
    const selectedIntention = elementIntentions[Math.floor(Math.random() * elementIntentions.length)];
    const selectedReflection = elementReflections[Math.floor(Math.random() * elementReflections.length)];

    // Insert into soul_daily_prompts
    const { data: newDaily, error: insertError } = await supabase
      .from('soul_daily_prompts')
      .insert({
        prompt_date: today,
        element: selectedElement,
        intention_prompt_id: selectedIntention.id,
        reflection_prompt_id: selectedReflection.id,
      })
      .select('id, prompt_date, element, created_at')
      .single();

    if (insertError) {
      console.error('Error inserting daily prompt:', insertError);
      throw insertError;
    }

    return {
      id: newDaily.id,
      prompt_date: newDaily.prompt_date,
      element: selectedElement,
      intention: selectedIntention.text,
      reflection: selectedReflection.text,
      created_at: newDaily.created_at,
    };

  } catch (error) {
    console.error('Error in ensureTodaySoulPrompt:', error);
    throw error;
  }
}