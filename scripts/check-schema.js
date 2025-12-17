const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  // Just fetch one row to see what columns exist
  const { data, error } = await supabase
    .from('secret_phrases')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample row:', JSON.stringify(data?.[0], null, 2));
    console.log('');
    console.log('Column names:', data?.[0] ? Object.keys(data[0]) : 'No data');
  }
}

checkSchema().then(() => process.exit(0));
