import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Present' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addOceanGirlPhrase() {
  console.log('Adding "ocean girl" as a secret phrase...');
  
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30); // Valid for 30 days

  // First check if it already exists
  const { data: existing, error: checkError } = await supabase
    .from('secret_phrases')
    .select('*')
    .eq('code', 'ocean girl')
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking existing phrase:', checkError);
    return;
  }

  if (existing) {
    console.log('⚠️  "ocean girl" phrase already exists!');
    console.log('Existing phrase:', existing);
    return;
  }

  const { data, error } = await supabase
    .from('secret_phrases')
    .insert({
      code: 'ocean girl',
      label: 'Ocean Girl Song - Test Secret Phrase',
      context: 'global',
      start_at: now.toISOString(),
      end_at: endDate.toISOString(),
      reward_heart_coins: 5
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error adding secret phrase:', error);
  } else {
    console.log('✅ Successfully added "ocean girl" as a secret phrase!');
    console.log('Data:', data);
  }
}

addOceanGirlPhrase().then(() => {
  console.log('Script completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});