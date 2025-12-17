const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAnonAccess() {
  console.log('🔍 Testing anon key access to songs table...\n');
  
  try {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .limit(3);

    if (error) {
      console.error('❌ Anon access error:', error);
      console.log('\nThis suggests the songs table may not have RLS policies allowing public read access.');
      return;
    }

    console.log(`✅ Anon key can access songs! Found ${data?.length || 0} songs`);
    if (data && data.length > 0) {
      console.log('Sample song:', JSON.stringify(data[0], null, 2));
    }

  } catch (err) {
    console.error('❌ Script error:', err);
  }
}

testAnonAccess();