const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function testQuestCompletion() {
  try {
    // Get a sample quest
    const { data: quests, error: questError } = await supabaseClient
      .from('bonus_quests')
      .select('*')
      .limit(1);

    if (questError) {
      console.error('Error fetching quests:', questError);
      return;
    }

    const quest = quests[0];
    console.log('Testing with quest:', quest.title);

    // Try to create a fake user ID for testing
    const testUserId = '12345678-1234-1234-1234-123456789abc';

    console.log('Attempting to insert quest completion...');

    // Test the insert that's failing in the code
    const { error: insertError } = await supabaseClient
      .from('user_bonus_quests')
      .insert({
        user_id: testUserId,
        bonus_quest_id: quest.id,
        times_completed: 1,
        last_completed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Insert error details:');
      console.error('Raw error:', insertError);
      console.error('Error message:', insertError.message);
      console.error('Error details:', insertError.details);
      console.error('Error hint:', insertError.hint);
      console.error('Error code:', insertError.code);
    } else {
      console.log('✅ Insert successful (this is unexpected with a fake user)');
    }

    // Check what RLS policies exist
    console.log('\nChecking RLS policies...');
    
    // Try with authenticated context (this will also fail since we don't have a real user)
    const { data: authUser } = await supabaseClient.auth.getUser();
    console.log('Current auth state:', !!authUser.user ? 'authenticated' : 'anonymous');

  } catch (error) {
    console.error('Test error:', error);
  }
}

testQuestCompletion();