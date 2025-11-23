import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Server-side Supabase client with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Elements cycle: heart -> water -> lightning -> darkness -> heart...
const ELEMENTS = ['heart', 'water', 'lightning', 'darkness'] as const;

// Define a consistent start date for the cycle (you can adjust this as needed)
const CYCLE_START_DATE = new Date('2024-01-01');

function getElementForDate(date: string): string {
  const dateObj = new Date(date);
  const cycleStartTime = CYCLE_START_DATE.getTime();
  const currentTime = dateObj.getTime();
  
  // Calculate days since cycle start
  const daysSinceStart = Math.floor((currentTime - cycleStartTime) / (1000 * 60 * 60 * 24));
  
  // Determine element based on 4-day cycle
  const elementIndex = daysSinceStart % 4;
  return ELEMENTS[elementIndex];
}

async function getOrderedPrompt(promptType: 'intention' | 'reflection', element: string, promptIndex: number) {
  // First try to fetch with sort_order, if that fails, fall back to id ordering
  let { data, error } = await supabase
    .from('soul_prompts')
    .select('id, text, element, prompt_type, sort_order')
    .eq('prompt_type', promptType)
    .eq('element', element)
    .order('sort_order', { ascending: true });

  // If sort_order column doesn't exist yet, fall back to ordering by id (creation order)
  if (error && (error.message.includes('sort_order') || error.message.includes('does not exist'))) {
    console.log(`Falling back to id ordering for ${promptType} ${element}`);
    const fallbackResult = await supabase
      .from('soul_prompts')
      .select('id, text, element, prompt_type')
      .eq('prompt_type', promptType)
      .eq('element', element)
      .order('id', { ascending: true });
    
    data = fallbackResult.data;
    error = fallbackResult.error;
    console.log(`Fallback result: ${data?.length} prompts found`);
  }

  if (error) {
    throw new Error(`Failed to fetch ${promptType} prompts: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`No ${promptType} prompts found for element ${element}`);
  }

  // Use modulo to wrap around if we've gone through all prompts
  const selectedPrompt = data[promptIndex % data.length];
  return selectedPrompt;
}

export async function GET(request: NextRequest) {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Check if daily prompts already exist for today
    const { data: existingPrompts, error: fetchError } = await supabase
      .from('soul_daily_prompts')
      .select(`
        prompt_date,
        element,
        intention_prompt_id,
        reflection_prompt_id,
        intention:soul_prompts!intention_prompt_id(id, text, element, prompt_type),
        reflection:soul_prompts!reflection_prompt_id(id, text, element, prompt_type)
      `)
      .eq('prompt_date', today)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing daily prompts:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch daily prompts' },
        { status: 500 }
      );
    }

    if (existingPrompts) {
      // Return existing prompts
      return NextResponse.json({
        prompt_date: existingPrompts.prompt_date,
        element: existingPrompts.element,
        intention: Array.isArray(existingPrompts.intention) 
          ? existingPrompts.intention[0] 
          : existingPrompts.intention,
        reflection: Array.isArray(existingPrompts.reflection) 
          ? existingPrompts.reflection[0] 
          : existingPrompts.reflection,
      });
    }

    // No existing prompts for today - create new ones using the ordered cycle
    const element = getElementForDate(today);
    
    // Count how many times this element has appeared in soul_daily_prompts
    const { data: elementCount, error: countError } = await supabase
      .from('soul_daily_prompts')
      .select('element', { count: 'exact', head: true })
      .eq('element', element);

    if (countError) {
      console.error('Error counting element occurrences:', countError);
      return NextResponse.json(
        { error: 'Failed to count element occurrences' },
        { status: 500 }
      );
    }

    // Use the count as the index for which prompt to select next
    const promptIndex = elementCount || 0;
    
    // Get ordered intention and reflection prompts for the element
    const [intentionPrompt, reflectionPrompt] = await Promise.all([
      getOrderedPrompt('intention', element, promptIndex),
      getOrderedPrompt('reflection', element, promptIndex),
    ]);

    // Insert new daily prompts record
    const { data: newPrompts, error: insertError } = await supabase
      .from('soul_daily_prompts')
      .insert({
        prompt_date: today,
        element: element,
        intention_prompt_id: intentionPrompt.id,
        reflection_prompt_id: reflectionPrompt.id,
      })
      .select(`
        prompt_date,
        element,
        intention_prompt_id,
        reflection_prompt_id
      `)
      .single();

    if (insertError) {
      console.error('Error inserting daily prompts:', insertError);
      return NextResponse.json(
        { error: 'Failed to create daily prompts' },
        { status: 500 }
      );
    }

    // Return the new prompts
    return NextResponse.json({
      prompt_date: newPrompts.prompt_date,
      element: newPrompts.element,
      intention: intentionPrompt,
      reflection: reflectionPrompt,
    });

  } catch (error) {
    console.error('Error in daily prompts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}