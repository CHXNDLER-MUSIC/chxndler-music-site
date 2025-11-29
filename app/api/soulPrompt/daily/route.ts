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
    const element = getElementForDate(today);

    // TEMPORARY: Since soul_prompts table doesn't exist, return hardcoded prompts
    // TODO: Create soul_prompts table in Supabase and remove this temporary fix
    console.log('Using temporary hardcoded prompts for element:', element);
    
    const hardcodedPrompts = {
      heart: {
        intention: { 
          id: 'temp-heart-intention', 
          text: 'What is one gentle way I can show myself love today?', 
          element: 'heart', 
          prompt_type: 'intention' 
        },
        reflection: { 
          id: 'temp-heart-reflection', 
          text: 'Where did love show up for me today?', 
          element: 'heart', 
          prompt_type: 'reflection' 
        }
      },
      water: {
        intention: { 
          id: 'temp-water-intention', 
          text: 'How can I let my emotions move instead of holding them back?', 
          element: 'water', 
          prompt_type: 'intention' 
        },
        reflection: { 
          id: 'temp-water-reflection', 
          text: 'What emotions flowed through me today?', 
          element: 'water', 
          prompt_type: 'reflection' 
        }
      },
      lightning: {
        intention: { 
          id: 'temp-lightning-intention', 
          text: 'Where can I channel my energy with purpose today?', 
          element: 'lightning', 
          prompt_type: 'intention' 
        },
        reflection: { 
          id: 'temp-lightning-reflection', 
          text: 'Where did I feel a spark of energy today?', 
          element: 'lightning', 
          prompt_type: 'reflection' 
        }
      },
      darkness: {
        intention: { 
          id: 'temp-darkness-intention', 
          text: 'What truth is quietly asking to be acknowledged today?', 
          element: 'darkness', 
          prompt_type: 'intention' 
        },
        reflection: { 
          id: 'temp-darkness-reflection', 
          text: 'What did silence teach me today?', 
          element: 'darkness', 
          prompt_type: 'reflection' 
        }
      }
    };

    const prompts = hardcodedPrompts[element as keyof typeof hardcodedPrompts];

    return NextResponse.json({
      prompt_date: today,
      element: element,
      intention: prompts.intention,
      reflection: prompts.reflection,
    });

  } catch (error) {
    console.error('Error in daily prompts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}