const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function test() {
  try {
    // Test 1: Check if soul_prompts table exists
    console.log('Testing soul_prompts table...');
    const { data, error } = await supabase
      .from('soul_prompts')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log('soul_prompts error:', error.message);
      console.log('Code:', error.code);
      
      if (error.code === '42P01') {
        console.log('❌ soul_prompts table does not exist');
        await createSoulPromptsTable();
      }
    } else {
      console.log('✅ soul_prompts table exists, rows:', data?.length || 0);
    }
    
    // Test 2: Check if soul_daily_prompts table exists
    console.log('\nTesting soul_daily_prompts table...');
    const { data: dailyData, error: dailyError } = await supabase
      .from('soul_daily_prompts')
      .select('*')
      .limit(1);
      
    if (dailyError) {
      console.log('soul_daily_prompts error:', dailyError.message);
      if (dailyError.code === '42P01') {
        console.log('❌ soul_daily_prompts table does not exist');
        await createSoulDailyPromptsTable();
      }
    } else {
      console.log('✅ soul_daily_prompts table exists, rows:', dailyData?.length || 0);
    }
    
    // Test 3: Insert sample prompts if table is empty
    await ensureSamplePrompts();
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

async function createSoulPromptsTable() {
  console.log('Creating soul_prompts table...');
  // We can't create tables directly through the client, need to use SQL
  // Let's check if we can insert data instead (table might exist but be empty)
  
  const samplePrompts = [
    { prompt_type: 'intention', element: 'heart', text: 'Test intention prompt', sort_order: 1 },
    { prompt_type: 'reflection', element: 'heart', text: 'Test reflection prompt', sort_order: 1 }
  ];
  
  const { error } = await supabase
    .from('soul_prompts')
    .insert(samplePrompts);
    
  if (error) {
    console.log('Cannot insert into soul_prompts:', error.message);
  } else {
    console.log('✅ Successfully inserted test data into soul_prompts');
  }
}

async function createSoulDailyPromptsTable() {
  console.log('Testing soul_daily_prompts insert...');
  // Similar test for daily prompts
}

async function ensureSamplePrompts() {
  const { data, error } = await supabase
    .from('soul_prompts')
    .select('*')
    .limit(5);
    
  if (error) {
    console.log('Cannot check soul_prompts count:', error.message);
    return;
  }
  
  if (data.length === 0) {
    console.log('No prompts found, inserting sample data...');
    await insertSamplePrompts();
  } else {
    console.log(`Found ${data.length} existing prompts`);
  }
}

async function insertSamplePrompts() {
  const prompts = [
    { prompt_type: 'intention', element: 'heart', text: 'What is one gentle way I can show myself love today?', sort_order: 1 },
    { prompt_type: 'reflection', element: 'heart', text: 'Where did love show up for me today?', sort_order: 1 },
    { prompt_type: 'intention', element: 'water', text: 'How can I let my emotions move instead of holding them back?', sort_order: 1 },
    { prompt_type: 'reflection', element: 'water', text: 'What emotions flowed through me today?', sort_order: 1 },
    { prompt_type: 'intention', element: 'lightning', text: 'Where can I channel my energy with purpose today?', sort_order: 1 },
    { prompt_type: 'reflection', element: 'lightning', text: 'Where did I feel a spark of energy today?', sort_order: 1 },
    { prompt_type: 'intention', element: 'darkness', text: 'What truth is quietly asking to be acknowledged today?', sort_order: 1 },
    { prompt_type: 'reflection', element: 'darkness', text: 'What did silence teach me today?', sort_order: 1 }
  ];
  
  const { error } = await supabase
    .from('soul_prompts')
    .insert(prompts);
    
  if (error) {
    console.error('Error inserting prompts:', error.message);
  } else {
    console.log('✅ Inserted sample prompts successfully!');
  }
}

test();