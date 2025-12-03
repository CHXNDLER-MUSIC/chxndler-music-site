const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey);
  process.exit(1);
}

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function checkBonusQuestTables() {
  try {
    console.log('Checking if bonus quests tables exist...');

    // Try to query the bonus_quests table
    const { data: questsData, error: questsError } = await supabaseClient
      .from('bonus_quests')
      .select('id')
      .limit(1);

    if (questsError) {
      console.log('bonus_quests table does not exist:', questsError.message);
      
      console.log('\n=== SETUP REQUIRED ===');
      console.log('You need to create the bonus quests tables in your Supabase database.');
      console.log('Please run the following SQL files in your Supabase SQL editor:');
      console.log('1. CREATE_BONUS_QUESTS_TABLES.sql');
      console.log('2. database/bonus-quests-policies.sql');
      console.log('3. database/bonus-quests-seed.sql');
      console.log('\nGo to: https://supabase.com/dashboard/project/hjpaiolhhugwzblarfix/sql');
      return false;
    }

    // Try to query the user_bonus_quests table
    const { data: userQuestsData, error: userQuestsError } = await supabaseClient
      .from('user_bonus_quests')
      .select('id')
      .limit(1);

    if (userQuestsError) {
      console.log('user_bonus_quests table does not exist:', userQuestsError.message);
      return false;
    }

    console.log('✅ Both bonus quest tables exist and are accessible');
    
    // Check if there are any quests seeded
    const { data: quests, error: questCountError } = await supabaseClient
      .from('bonus_quests')
      .select('*');

    if (questCountError) {
      console.log('Error reading quests:', questCountError.message);
      return false;
    }

    console.log(`Found ${quests?.length || 0} bonus quests in the database`);
    if (quests && quests.length > 0) {
      console.log('Quest titles:', quests.map(q => q.title).join(', '));
    }

    return true;

  } catch (error) {
    console.error('Error checking tables:', error);
    return false;
  }
}

if (require.main === module) {
  checkBonusQuestTables().then(exists => {
    if (!exists) {
      process.exit(1);
    }
  });
}

module.exports = { checkBonusQuestTables };