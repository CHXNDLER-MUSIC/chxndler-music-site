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

async function addContextColumn() {
  console.log('Adding context column to secret_phrases table...');
  
  // Use raw SQL to add the column
  const { error: addColumnError } = await supabase.rpc('sql', {
    query: `
      ALTER TABLE public.secret_phrases 
      ADD COLUMN IF NOT EXISTS context text DEFAULT 'global';
    `
  });

  if (addColumnError) {
    console.error('❌ Error adding context column:', addColumnError);
    return;
  }

  console.log('✅ Successfully added context column!');
  
  // Update existing records to have proper context values
  // Set "ocean girl" to 'live_show' context for bonus quest compatibility
  console.log('Updating ocean girl phrase to live_show context...');
  
  const { error: updateError } = await supabase
    .from('secret_phrases')
    .update({ context: 'live_show' })
    .eq('code', 'ocean girl');

  if (updateError) {
    console.error('❌ Error updating ocean girl context:', updateError);
    return;
  }

  console.log('✅ Updated ocean girl phrase context to live_show!');
  
  // Verify the changes
  const { data: updated, error: fetchError } = await supabase
    .from('secret_phrases')
    .select('code, context')
    .eq('code', 'ocean girl')
    .single();

  if (fetchError) {
    console.error('❌ Error fetching updated data:', fetchError);
  } else {
    console.log('📊 Updated ocean girl phrase:', updated);
  }
}

addContextColumn().then(() => {
  console.log('Script completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});