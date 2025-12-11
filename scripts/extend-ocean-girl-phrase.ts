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

async function extendOceanGirlPhrase() {
  console.log('Extending "ocean girl" phrase validity...');
  
  const now = new Date();
  const extendedEndDate = new Date();
  extendedEndDate.setDate(extendedEndDate.getDate() + 30); // Extend for 30 more days
  
  console.log('Current time:', now.toISOString());
  console.log('New end date:', extendedEndDate.toISOString());

  const { data, error } = await supabase
    .from('secret_phrases')
    .update({
      end_at: extendedEndDate.toISOString(),
      start_at: now.toISOString() // Also update start time to now to ensure it's active
    })
    .eq('code', 'ocean girl')
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating secret phrase:', error);
  } else {
    console.log('✅ Successfully extended "ocean girl" phrase validity!');
    console.log('Updated data:', data);
  }
}

extendOceanGirlPhrase().then(() => {
  console.log('Script completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});