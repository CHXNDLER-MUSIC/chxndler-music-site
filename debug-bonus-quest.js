const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function debugBonusQuest() {
  try {
    console.log('Debugging bonus quest "ATTEND_LIVESTREAM"...');

    // First get the quest directly from bonus_quests table
    const { data: questData, error: questError } = await supabaseClient
      .from('bonus_quests')
      .select('*')
      .eq('quest_key', 'ATTEND_LIVESTREAM')
      .single();

    if (questError) {
      console.error('Error fetching quest:', questError);
      return;
    }

    console.log('Quest data:', questData);
    console.log('Is active:', questData.is_active);
    console.log('Max times per day:', questData.max_times_per_day);
    console.log('Max total completions:', questData.max_total_completions);

    // Now test the getBonusQuestsForUser function without a user
    const { getBonusQuestsForUser } = require('./lib/bonusQuests.ts');
    
    console.log('\nTesting getBonusQuestsForUser without user...');
    const questsWithoutUser = await getBonusQuestsForUser(null);
    
    const attendQuest = questsWithoutUser.find(q => q.quest_key === 'ATTEND_LIVESTREAM');
    console.log('Attend quest (no user):', attendQuest);
    
    if (attendQuest) {
      console.log('Can complete (no user):', attendQuest.can_complete);
      console.log('Completed today (no user):', attendQuest.completed_today);
      console.log('Times completed (no user):', attendQuest.times_completed);
    }

    // Test with a fake user ID to see the difference
    console.log('\nTesting getBonusQuestsForUser with fake user...');
    const questsWithUser = await getBonusQuestsForUser('fake-user-id');
    
    const attendQuestWithUser = questsWithUser.find(q => q.quest_key === 'ATTEND_LIVESTREAM');
    console.log('Attend quest (with fake user):', attendQuestWithUser);
    
    if (attendQuestWithUser) {
      console.log('Can complete (with fake user):', attendQuestWithUser.can_complete);
      console.log('Completed today (with fake user):', attendQuestWithUser.completed_today);
      console.log('Times completed (with fake user):', attendQuestWithUser.times_completed);
    }

  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugBonusQuest();