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

async function debugSchema() {
  console.log('Checking current secret_phrases table structure...');
  
  // Fetch all secret phrases to see the actual structure
  const { data, error } = await supabase
    .from('secret_phrases')
    .select('*');

  if (error) {
    console.error('❌ Error fetching secret phrases:', error);
  } else {
    console.log('✅ Current secret phrases data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data && data.length > 0) {
      console.log('\n📊 Available columns in secret_phrases table:');
      console.log(Object.keys(data[0]).join(', '));
    }
  }
}

debugSchema().then(() => {
  console.log('Debug completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Debug failed:', error);
  process.exit(1);
});