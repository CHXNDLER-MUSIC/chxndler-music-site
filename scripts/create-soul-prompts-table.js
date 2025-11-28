const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function createSoulPromptsTable() {
  console.log('🏗️  Creating soul_prompts table...');
  
  try {
    // Since we can't execute raw SQL directly through the client,
    // let's create the table by trying to insert data first
    // and if it fails, we know the table doesn't exist
    
    // First, check if table exists by trying to select
    const { error: selectError } = await supabase
      .from('soul_prompts')
      .select('*')
      .limit(1);
      
    if (selectError && selectError.code === 'PGRST205') {
      console.log('❌ soul_prompts table does not exist in schema cache');
      console.log('🔧 The table needs to be created manually in Supabase dashboard');
      console.log('');
      console.log('Please run this SQL in your Supabase SQL editor:');
      console.log('');
      console.log(`
-- Create soul_prompts table
CREATE TABLE IF NOT EXISTS public.soul_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_type text not null check (prompt_type in ('intention', 'reflection')),
  element text not null check (element in ('heart', 'water', 'lightning', 'darkness')),
  text text not null,
  sort_order integer,
  created_at timestamptz not null default now()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS soul_prompts_type_element_idx
  ON public.soul_prompts (prompt_type, element);

CREATE INDEX IF NOT EXISTS soul_prompts_sort_order_idx
  ON public.soul_prompts (element, prompt_type, sort_order);

-- Enable RLS for soul_prompts
ALTER TABLE public.soul_prompts ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read soul prompts (they're public)
CREATE POLICY "allow_soul_prompts_select_anon"
  ON public.soul_prompts FOR SELECT TO anon
  USING (true);

CREATE POLICY "allow_soul_prompts_select_authenticated"
  ON public.soul_prompts FOR SELECT TO authenticated
  USING (true);

-- Only service role can manage prompts
CREATE POLICY "service_role_can_manage_soul_prompts"
  ON public.soul_prompts FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
      `);
      console.log('');
      console.log('After creating the table, run this script again to populate it with prompts.');
      
    } else if (selectError) {
      console.error('❌ Unexpected error:', selectError.message);
    } else {
      console.log('✅ soul_prompts table exists, checking data...');
      await populatePrompts();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function populatePrompts() {
  // Check if there are any prompts
  const { data: existing, error: countError } = await supabase
    .from('soul_prompts')
    .select('*')
    .limit(5);
    
  if (countError) {
    console.error('❌ Error checking existing prompts:', countError.message);
    return;
  }
  
  if (existing && existing.length > 0) {
    console.log(`✅ Found ${existing.length} existing prompts, skipping population`);
    return;
  }
  
  console.log('📝 Populating soul_prompts with initial data...');
  
  const prompts = [
    // Heart intentions
    { prompt_type: 'intention', element: 'heart', text: 'What is one gentle way I can show myself love today?', sort_order: 1 },
    { prompt_type: 'intention', element: 'heart', text: 'How can I lead with softness instead of fear?', sort_order: 2 },
    { prompt_type: 'intention', element: 'heart', text: 'What part of my heart needs warmth right now?', sort_order: 3 },
    
    // Heart reflections
    { prompt_type: 'reflection', element: 'heart', text: 'Where did love show up for me today?', sort_order: 1 },
    { prompt_type: 'reflection', element: 'heart', text: 'Did I speak to myself with kindness today?', sort_order: 2 },
    { prompt_type: 'reflection', element: 'heart', text: 'What emotion sat closest to my chest today?', sort_order: 3 },
    
    // Water intentions
    { prompt_type: 'intention', element: 'water', text: 'How can I let my emotions move instead of holding them back?', sort_order: 1 },
    { prompt_type: 'intention', element: 'water', text: 'What would it look like to flow instead of force today?', sort_order: 2 },
    { prompt_type: 'intention', element: 'water', text: 'Where can I allow softness into my day?', sort_order: 3 },
    
    // Water reflections
    { prompt_type: 'reflection', element: 'water', text: 'What emotions flowed through me today?', sort_order: 1 },
    { prompt_type: 'reflection', element: 'water', text: 'Where did I resist what I should have allowed?', sort_order: 2 },
    { prompt_type: 'reflection', element: 'water', text: 'What helped me feel calm today?', sort_order: 3 },
    
    // Lightning intentions
    { prompt_type: 'intention', element: 'lightning', text: 'Where can I channel my energy with purpose today?', sort_order: 1 },
    { prompt_type: 'intention', element: 'lightning', text: 'What bold action can I take to ignite momentum?', sort_order: 2 },
    { prompt_type: 'intention', element: 'lightning', text: 'What idea sparks excitement in me right now?', sort_order: 3 },
    
    // Lightning reflections
    { prompt_type: 'reflection', element: 'lightning', text: 'Where did I feel a spark of energy today?', sort_order: 1 },
    { prompt_type: 'reflection', element: 'lightning', text: 'What action made me feel powerful today?', sort_order: 2 },
    { prompt_type: 'reflection', element: 'lightning', text: 'Where did I hesitate when I wanted to move forward?', sort_order: 3 },
    
    // Darkness intentions
    { prompt_type: 'intention', element: 'darkness', text: 'What truth is quietly asking to be acknowledged today?', sort_order: 1 },
    { prompt_type: 'intention', element: 'darkness', text: 'Where can I slow down and listen more deeply?', sort_order: 2 },
    { prompt_type: 'intention', element: 'darkness', text: 'What fear is ready to be softened?', sort_order: 3 },
    
    // Darkness reflections
    { prompt_type: 'reflection', element: 'darkness', text: 'What did silence teach me today?', sort_order: 1 },
    { prompt_type: 'reflection', element: 'darkness', text: 'Where did I face discomfort or uncertainty?', sort_order: 2 },
    { prompt_type: 'reflection', element: 'darkness', text: 'What truth did I uncover about myself today?', sort_order: 3 },
  ];
  
  const { error } = await supabase
    .from('soul_prompts')
    .insert(prompts);
    
  if (error) {
    console.error('❌ Error inserting prompts:', error.message);
  } else {
    console.log('✅ Successfully populated soul_prompts table!');
  }
}

createSoulPromptsTable();