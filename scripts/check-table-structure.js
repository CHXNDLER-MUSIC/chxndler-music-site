const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkTableStructure() {
  try {
    console.log('Checking soul_daily_prompts table structure...');
    
    const { data, error } = await supabase
      .from('soul_daily_prompts')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('Columns in soul_daily_prompts:');
      console.log(Object.keys(data[0]));
      console.log('\nSample row:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('Table exists but no data found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTableStructure().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});