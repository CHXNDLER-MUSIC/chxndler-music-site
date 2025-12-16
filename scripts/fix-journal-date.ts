import { createClient } from '@supabase/supabase-js';

function getLocalDateString(): string {
  const now = new Date();
  // Convert to EST/New York timezone
  const easternTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  
  const year = easternTime.find(part => part.type === 'year')?.value;
  const month = easternTime.find(part => part.type === 'month')?.value;
  const day = easternTime.find(part => part.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}

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

  // Check for any entries containing 12/14 or 12/15
  const { data: matchingEntries, error: matchError } = await supabase
    .from('soul_daily_prompts')
    .select('*')
    .or('prompt_date.like.%12-14%,prompt_date.like.%12-15%');

  if (matchError) {
    console.error('Error searching for 12/14 or 12/15 entries:', matchError);
  } else {
    console.log('Entries containing 12/14 or 12/15:', matchingEntries);
  }

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