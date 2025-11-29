const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTodayPrompt() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Creating soul daily prompt for ${today}...`);
  
  try {
    // Check if entry already exists
    const { data: existing, error: checkError } = await supabase
      .from('soul_daily_prompts')
      .select('*')
      .eq('prompt_date', today)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing prompt:', checkError);
      return;
    }

    if (existing) {
      console.log(`Prompt already exists for ${today}:`, existing);
      return existing;
    }

    // Create a new entry for today - let's make it Lightning element to test
    const newPrompt = {
      prompt_date: today,
      element: 'lightning',
      // Since soul_prompts table doesn't exist, we'll insert without foreign keys
      // This simulates what would happen if we only use soul_daily_prompts as source of truth
    };

    const { data, error } = await supabase
      .from('soul_daily_prompts')
      .insert(newPrompt)
      .select()
      .single();

    if (error) {
      console.error('Error creating prompt:', error);
      
      // If this fails, let's check what columns exist
      console.log('Checking table structure...');
      const { data: tableInfo, error: tableError } = await supabase
        .from('soul_daily_prompts')
        .select('*')
        .limit(1);
        
      if (tableError) {
        console.log('Table check error:', tableError);
      } else {
        console.log('Table exists, sample row structure:', Object.keys(tableInfo[0] || {}));
      }
      
      return;
    }

    console.log(`✅ Created prompt for ${today}:`, data);
    return data;

  } catch (error) {
    console.error('Error in createTodayPrompt:', error);
  }
}

createTodayPrompt().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});