const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing with ANON key (what browser uses)...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, anonKey);

async function testQuery() {
  const today = new Date().toISOString().split('T')[0];
  console.log('Today (UTC):', today);
  console.log('');

  // Test the exact query the app uses
  console.log('=== Testing exact query from HeartCoinButton ===');
  const { data, error } = await supabase
    .from('secret_phrases')
    .select('*')
    .ilike('secret_phrase', 'ocean girl')
    .eq('active_date', today)
    .eq('is_active', true)
    .maybeSingle();

  console.log('Error:', error);
  console.log('Data:', data);

  if (error) {
    console.log('❌ Query failed - likely RLS issue');
  } else if (!data) {
    console.log('❌ No data returned - phrase not found or RLS blocking');
  } else {
    console.log('✅ Query succeeded!');
  }

  // Also try without any filters
  console.log('');
  console.log('=== Testing basic select ===');
  const { data: all, error: allErr } = await supabase
    .from('secret_phrases')
    .select('*');

  console.log('All phrases error:', allErr);
  console.log('All phrases count:', all?.length || 0);
  if (all?.length > 0) {
    console.log('First phrase:', all[0]);
  }
}

testQuery().then(() => process.exit(0));
