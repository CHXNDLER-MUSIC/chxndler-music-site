const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfileColumns() {
  try {
    console.log('Checking profiles table structure...');
    
    // Try to query with different column combinations to see what works
    const columnVariations = [
      ['id', 'daily_streak', 'streak_last_updated'],
      ['id', 'daily_streak_current', 'streak_last_updated'],
      ['id', 'daily_streak', 'streak_last_updated_date'],
      ['id', 'daily_streak_current'],
      ['id', 'daily_streak'],
      ['id'] // fallback to just id
    ];
    
    for (const [index, columns] of columnVariations.entries()) {
      console.log(`\nTrying column set ${index + 1}: ${columns.join(', ')}`);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(columns.join(', '))
        .limit(1);
      
      if (error) {
        console.log(`❌ Failed: ${error.message}`);
      } else {
        console.log(`✅ Success! Available columns: ${columns.join(', ')}`);
        if (data && data.length > 0) {
          console.log('Sample data structure:', Object.keys(data[0]));
        }
      }
    }
    
    // Try to get any profile to see its actual structure
    console.log('\n--- Trying to get any profile record to see structure ---');
    const { data: anyProfile, error: anyError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (anyError) {
      console.log('❌ Failed to get any profile:', anyError.message);
    } else if (anyProfile && anyProfile.length > 0) {
      console.log('✅ Profile structure (all columns):');
      console.log(Object.keys(anyProfile[0]));
    } else {
      console.log('No profiles found in database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProfileColumns().then(() => {
  console.log('\nColumn check completed');
  process.exit(0);
}).catch(error => {
  console.error('Check failed:', error);
  process.exit(1);
});