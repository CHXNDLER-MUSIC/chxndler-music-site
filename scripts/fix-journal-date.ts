import { createClient } from '@supabase/supabase-js';
import { getLocalDateString } from '../utils/dateHelpers.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkAndFixDate() {
  const today = getLocalDateString();
  console.log('Today should be:', today);

  // Check what's currently in the database
  const { data: existingPrompts, error: selectError } = await supabase
    .from('soul_daily_prompts')
    .select('*')
    .order('prompt_date', { ascending: false })
    .limit(5);

  if (selectError) {
    console.error('Error fetching prompts:', selectError);
    return;
  }

  console.log('Recent entries in soul_daily_prompts:');
  existingPrompts?.forEach(prompt => {
    console.log(`- ${prompt.prompt_date}: ${prompt.element} (id: ${prompt.id})`);
  });

  // Look for today's entry
  const todayEntry = existingPrompts?.find(p => p.prompt_date === today);
  if (todayEntry) {
    console.log(`Found entry for today (${today}):`, todayEntry);
    return; // Already correct
  }

  // Look for yesterday's entry that might need updating
  const yesterday = '2025-12-14';
  const yesterdayEntry = existingPrompts?.find(p => p.prompt_date === yesterday);
  
  if (yesterdayEntry) {
    console.log(`Found yesterday's entry that should be today:`, yesterdayEntry);
    
    // Update the prompt_date to today
    const { data: updatedEntry, error: updateError } = await supabase
      .from('soul_daily_prompts')
      .update({ prompt_date: today })
      .eq('id', yesterdayEntry.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating prompt date:', updateError);
      return;
    }

    console.log(`Successfully updated entry to today's date:`, updatedEntry);
  } else {
    console.log('No entry found to update. You may need to create a new entry.');
  }
}

checkAndFixDate().catch(console.error);