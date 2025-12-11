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

async function fixSecretPhrasesTable() {
  console.log('Fixing secret_phrases table schema...');
  
  try {
    // First, let's check current structure
    console.log('1. Checking current table structure...');
    const { data: current, error: fetchError } = await supabase
      .from('secret_phrases')
      .select('*')
      .eq('code', 'ocean girl')
      .single();

    if (fetchError) {
      console.error('Error fetching current data:', fetchError);
      return;
    }
    
    console.log('Current ocean girl data:', current);
    
    // Check if context column exists by trying to update it
    console.log('2. Testing if context column exists...');
    const { error: testError } = await supabase
      .from('secret_phrases')
      .update({ context: 'live_show' })
      .eq('id', current.id);

    if (testError && testError.message.includes("Could not find the 'context' column")) {
      console.log('❌ Context column does not exist. Need to add it manually in Supabase dashboard.');
      console.log('Please run this SQL in your Supabase SQL editor:');
      console.log('ALTER TABLE public.secret_phrases ADD COLUMN IF NOT EXISTS context text DEFAULT \'global\';');
      console.log('Then run this script again to update the ocean girl phrase.');
      return;
      
    } else if (testError) {
      console.error('Unexpected error updating context:', testError);
      return;
    } else {
      console.log('✅ Context column already exists and ocean girl updated to live_show!');
    }
    
    // Final verification
    const { data: final, error: finalError } = await supabase
      .from('secret_phrases')
      .select('*')
      .eq('code', 'ocean girl')
      .single();

    if (finalError) {
      console.error('Error fetching final data:', finalError);
    } else {
      console.log('📊 Final ocean girl data:', final);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixSecretPhrasesTable().then(() => {
  console.log('Script completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});