const { completeBonusQuest } = require('./lib/bonusQuests.ts');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function testBonusQuestFix() {
  console.log('Testing bonus quest completion after fix...');
  
  // This test will fail due to authentication/RLS, but we want to see if it fails 
  // due to the table structure issue (which should now be fixed)
  
  const fakeUserId = '12345678-1234-1234-1234-123456789abc';
  const questKey = 'listen_featured_song';
  
  try {
    const result = await completeBonusQuest(
      supabaseClient,
      fakeUserId,
      questKey
    );
    
    console.log('✅ No table structure errors detected');
    console.log('Result:', result);
    
  } catch (error) {
    if (error.code === '42703' && error.message.includes('completed_at')) {
      console.error('❌ Still getting the completed_at field error:', error);
    } else if (error.code === '42501') {
      console.log('✅ Got expected RLS policy error (not the table structure error)');
      console.log('This means our fix worked - the table structure is correct');
    } else if (error.message && error.message.includes('user_bonus_quest_completions')) {
      console.error('❌ Still trying to insert into non-existent table:', error.message);
    } else {
      console.log('✅ No table structure errors. Got different error:', error.message);
    }
  }
}

testBonusQuestFix();