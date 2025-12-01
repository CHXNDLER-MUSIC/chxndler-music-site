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

    // ALWAYS check Supabase first - the table is the source of truth
    let { data: dailyPrompt, error: dailyError } = await supabase
      .from('soul_daily_prompts')
      .select(`
        id,
        prompt_date,
        element,
        intention,
        prompt
      `)
      .eq('prompt_date', today)
      .maybeSingle();

    if (dailyError && dailyError.code !== 'PGRST116') {
      console.error('Error fetching daily prompt:', dailyError);
      throw new Error(`Failed to fetch daily prompt: ${dailyError.message}`);
    }

    // If daily prompt exists in database, use it as the absolute source of truth
    if (dailyPrompt) {
      console.log(`Using daily prompt from database for ${today}: element=${dailyPrompt.element}`);
      
      // Ensure we have valid prompt data
      if (!dailyPrompt?.intention || !dailyPrompt?.prompt) {
        console.error('Invalid daily prompt data in database:', dailyPrompt);
        throw new Error('Invalid daily prompt structure in database');
      }

      return NextResponse.json({
        id: dailyPrompt.id, // Add the daily prompt ID for journal entries
        prompt_date: dailyPrompt.prompt_date,
        element: dailyPrompt.element, // This comes directly from the database
        intention: {
          id: dailyPrompt.id,
          text: dailyPrompt.intention,
          element: dailyPrompt.element,
          prompt_type: 'intention'
        },
        reflection: {
          id: dailyPrompt.id,
          text: dailyPrompt.prompt, // The 'prompt' column serves as reflection prompt
          element: dailyPrompt.element,
          prompt_type: 'reflection'
        },
      });
    }

    // If no database entry exists, we cannot create one without the soul_prompts table
    // This should prompt the admin to create the entry manually
    console.warn(`No daily prompt found in database for ${today}. Database should be the source of truth.`);
    
    return NextResponse.json(
      { 
        error: 'No daily prompt configured',
        message: `No soul prompt entry found for ${today}. Please create an entry in the soul_daily_prompts table.`,
        date: today
      },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error in daily prompts API:', error);
    
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        message: 'Could not connect to soul prompts database. Please try again later.',
        date: new Date().toISOString().split('T')[0]
      },
      { status: 500 }
    );
  }
}