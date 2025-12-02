const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProfileQuery() {
  try {
    console.log('Testing the fixed ProfileContext query...');
    
    // Test the exact query that ProfileContext uses
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, phone, name, element, journey, heartcoin_balance, heartcoin_total, profile_complete, created_at, updated_at, daily_streak_current, last_streak_activity_date, profile_image_url, has_seen_tour"
      )
      .limit(1);
    
    if (error) {
      console.error('❌ ProfileContext query failed:', error.message);
      return false;
    }
    
    console.log('✅ ProfileContext query successful!');
    
    if (data && data.length > 0) {
      console.log('Sample profile data structure:');
      console.log('- ID:', data[0].id ? '✅' : '❌');
      console.log('- daily_streak_current:', typeof data[0].daily_streak_current, '(', data[0].daily_streak_current, ')');
      console.log('- last_streak_activity_date:', typeof data[0].last_streak_activity_date, '(', data[0].last_streak_activity_date, ')');
      console.log('- All selected fields:', Object.keys(data[0]).join(', '));
    } else {
      console.log('No profile data found (empty result)');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
    return false;
  }
}

testProfileQuery().then((success) => {
  if (success) {
    console.log('\n🎉 ProfileContext daily streak fix is working correctly!');
  } else {
    console.log('\n❌ ProfileContext still has issues');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});