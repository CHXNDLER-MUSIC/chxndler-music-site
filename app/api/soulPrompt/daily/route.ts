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

function getElementForDate(date: string): string {
  // Use date hash to get consistent element selection
  const dateObj = new Date(date);
  const daysSinceEpoch = Math.floor(dateObj.getTime() / (1000 * 60 * 60 * 24));
  return ELEMENTS[daysSinceEpoch % ELEMENTS.length];
}

async function getRandomPrompt(promptType: 'intention' | 'reflection', element: string) {
  const { data, error } = await supabase
    .from('soul_prompts')
    .select('id, text, element, prompt_type')
    .eq('prompt_type', promptType)
    .eq('element', element);

  if (error) {
    throw new Error(`Failed to fetch ${promptType} prompts: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`No ${promptType} prompts found for element ${element}`);
  }

  // Select random prompt
  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
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

    // No existing prompts for today - create new ones
    const element = getElementForDate(today);
    
    // Get random intention and reflection prompts for the element
    const [intentionPrompt, reflectionPrompt] = await Promise.all([
      getRandomPrompt('intention', element),
      getRandomPrompt('reflection', element),
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