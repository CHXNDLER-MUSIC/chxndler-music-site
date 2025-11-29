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

    // Check if soul_daily_prompts entry exists for today
    let { data: dailyPrompt, error: dailyError } = await supabase
      .from('soul_daily_prompts')
      .select(`
        id,
        prompt_date,
        element,
        intention_prompt_id,
        reflection_prompt_id,
        intention:soul_prompts!intention_prompt_id (
          id,
          text,
          element,
          prompt_type
        ),
        reflection:soul_prompts!reflection_prompt_id (
          id,
          text,
          element,
          prompt_type
        )
      `)
      .eq('prompt_date', today)
      .maybeSingle();

    if (dailyError && dailyError.code !== 'PGRST116') {
      console.error('Error fetching daily prompt:', dailyError);
      throw new Error(`Failed to fetch daily prompt: ${dailyError.message}`);
    }

    // If no daily prompt exists, create one
    if (!dailyPrompt) {
      console.log(`No daily prompt found for ${today}, creating one for element: ${element}`);
      
      // For now, manually set today to be "darkness" element
      // Later this could be manually configured or use a different system
      const todayElement = 'darkness'; // Override calculated element for manual control
      
      // Calculate prompt indices based on days since cycle start
      const cycleStartTime = CYCLE_START_DATE.getTime();
      const currentTime = new Date(today).getTime();
      const daysSinceStart = Math.floor((currentTime - cycleStartTime) / (1000 * 60 * 60 * 24));
      
      // Use a different index for intention vs reflection to add variety
      const intentionPromptIndex = Math.floor(daysSinceStart / 4); // Changes every 4 days (full element cycle)
      const reflectionPromptIndex = Math.floor(daysSinceStart / 4) + 1; // Offset by 1 for variety
      
      // Get the prompts from soul_prompts table using the override element
      const intentionPrompt = await getOrderedPrompt('intention', todayElement, intentionPromptIndex);
      const reflectionPrompt = await getOrderedPrompt('reflection', todayElement, reflectionPromptIndex);

      // Create the daily prompt entry
      const { data: newDailyPrompt, error: insertError } = await supabase
        .from('soul_daily_prompts')
        .insert({
          prompt_date: today,
          element: todayElement, // Use the manual override
          intention_prompt_id: intentionPrompt.id,
          reflection_prompt_id: reflectionPrompt.id
        })
        .select(`
          id,
          prompt_date,
          element,
          intention_prompt_id,
          reflection_prompt_id,
          intention:soul_prompts!intention_prompt_id (
            id,
            text,
            element,
            prompt_type
          ),
          reflection:soul_prompts!reflection_prompt_id (
            id,
            text,
            element,
            prompt_type
          )
        `)
        .single();

      if (insertError) {
        console.error('Error creating daily prompt:', insertError);
        throw new Error(`Failed to create daily prompt: ${insertError.message}`);
      }

      dailyPrompt = newDailyPrompt;
    }

    // Ensure we have valid prompt data
    if (!dailyPrompt?.intention || !dailyPrompt?.reflection) {
      console.error('Invalid daily prompt data:', dailyPrompt);
      throw new Error('Invalid daily prompt structure');
    }

    return NextResponse.json({
      prompt_date: dailyPrompt.prompt_date,
      element: dailyPrompt.element,
      intention: Array.isArray(dailyPrompt.intention) ? dailyPrompt.intention[0] : dailyPrompt.intention,
      reflection: Array.isArray(dailyPrompt.reflection) ? dailyPrompt.reflection[0] : dailyPrompt.reflection,
    });

  } catch (error) {
    console.error('Error in daily prompts API:', error);
    
    // Fallback to hardcoded prompts if database fails
    const today = new Date().toISOString().split('T')[0];
    const element = 'darkness'; // Manual override for today
    
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
  }
}