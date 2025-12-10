// Quick script to add "ocean girl" as a secret phrase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addOceanGirlPhrase() {
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30); // Valid for 30 days

  const { data, error } = await supabase
    .from('secret_phrases')
    .insert({
      code: 'ocean girl',
      label: 'Test phrase - Ocean Girl song',
      context: 'global',
      start_at: now.toISOString(),
      end_at: endDate.toISOString(),
      reward_heart_coins: 5
    });

  if (error) {
    console.error('Error adding secret phrase:', error);
  } else {
    console.log('✅ Successfully added "ocean girl" as a secret phrase!');
    console.log('Data:', data);
  }
}

addOceanGirlPhrase();