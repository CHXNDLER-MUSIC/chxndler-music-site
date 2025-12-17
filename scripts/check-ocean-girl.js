const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOceanGirl() {
  const now = new Date().toISOString();
  console.log('Current time:', now);
  console.log('');

  // Check all secret phrases
  console.log('=== All secret phrases in database ===');
  const { data: allPhrases, error: allError } = await supabase
    .from('secret_phrases')
    .select('*');

  if (allError) {
    console.error('Error fetching all phrases:', allError);
  } else {
    console.log('Total phrases:', allPhrases?.length || 0);
    allPhrases?.forEach(p => {
      console.log(`- "${p.code}" | start: ${p.start_at} | end: ${p.end_at} | reward: ${p.reward_heart_coins}`);
    });
  }

  console.log('');

  // Check for ocean girl specifically
  console.log('=== Checking "ocean girl" specifically ===');
  const { data: oceanGirl, error: ogError } = await supabase
    .from('secret_phrases')
    .select('*')
    .ilike('code', 'ocean girl');

  if (ogError) {
    console.error('Error:', ogError);
  } else if (!oceanGirl || oceanGirl.length === 0) {
    console.log('❌ "ocean girl" NOT FOUND in database');
  } else {
    const phrase = oceanGirl[0];
    console.log('Found:', phrase);

    const startAt = new Date(phrase.start_at);
    const endAt = new Date(phrase.end_at);
    const nowDate = new Date(now);

    console.log('');
    console.log('Time check:');
    console.log('  start_at:', phrase.start_at, '| Started:', startAt <= nowDate ? 'YES' : 'NO');
    console.log('  end_at:', phrase.end_at, '| Not expired:', endAt >= nowDate ? 'YES' : 'NO');

    if (startAt <= nowDate && endAt >= nowDate) {
      console.log('✅ Phrase should be ACTIVE');
    } else {
      console.log('❌ Phrase is NOT ACTIVE (date range issue)');
    }
  }
}

checkOceanGirl().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
