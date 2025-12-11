import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOceanGirlContext() {
  console.log('Fixing "ocean girl" phrase context...');
  
  const { data: current, error: fetchError } = await supabase
    .from('secret_phrases')
    .select('*')
    .eq('code', 'ocean girl')
    .single();

  if (fetchError) {
    console.error('❌ Error fetching current phrase:', fetchError);
    return;
  }

  console.log('Current phrase data:', current);

  const { data, error } = await supabase
    .from('secret_phrases')
    .update({
      context: 'live_show'
    })
    .eq('code', 'ocean girl')
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating secret phrase context:', error);
  } else {
    console.log('✅ Successfully updated "ocean girl" phrase context to "live_show"!');
    console.log('Updated data:', data);
  }
}

fixOceanGirlContext().then(() => {
  console.log('Script completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});