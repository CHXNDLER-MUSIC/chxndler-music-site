const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const lightningPrompts = [
  // Intention prompts
  {
    prompt_type: 'intention',
    element: 'lightning',
    text: 'Where can I channel my energy with purpose today?',
    sort_order: 1
  },
  {
    prompt_type: 'intention',
    element: 'lightning',
    text: 'How can I ignite my inner spark and share it with the world?',
    sort_order: 2
  },
  {
    prompt_type: 'intention',
    element: 'lightning',
    text: 'What powerful action will I take to move toward my dreams today?',
    sort_order: 3
  },
  {
    prompt_type: 'intention',
    element: 'lightning',
    text: 'How can I be a source of inspiration and energy for others today?',
    sort_order: 4
  },
  {
    prompt_type: 'intention',
    element: 'lightning',
    text: 'What bold step will I take to break through my limitations?',
    sort_order: 5
  },
  
  // Reflection prompts
  {
    prompt_type: 'reflection',
    element: 'lightning',
    text: 'Where did I feel a spark of energy today?',
    sort_order: 1
  },
  {
    prompt_type: 'reflection',
    element: 'lightning',
    text: 'What moments today felt electric with possibility?',
    sort_order: 2
  },
  {
    prompt_type: 'reflection',
    element: 'lightning',
    text: 'How did I use my power and energy today? What impact did I create?',
    sort_order: 3
  },
  {
    prompt_type: 'reflection',
    element: 'lightning',
    text: 'What breakthrough or insight struck me like lightning today?',
    sort_order: 4
  },
  {
    prompt_type: 'reflection',
    element: 'lightning',
    text: 'Where did I show courage and take action despite fear?',
    sort_order: 5
  }
];

async function populateLightningPrompts() {
  console.log('Populating Lightning element prompts...');
  
  try {
    // Check if lightning prompts already exist
    const { data: existing, error: checkError } = await supabase
      .from('soul_prompts')
      .select('*')
      .eq('element', 'lightning');

    if (checkError) {
      console.error('Error checking existing prompts:', checkError);
      return;
    }

    if (existing && existing.length > 0) {
      console.log(`Found ${existing.length} existing lightning prompts. Skipping insertion.`);
      return;
    }

    // Insert all lightning prompts
    const { data, error } = await supabase
      .from('soul_prompts')
      .insert(lightningPrompts)
      .select();

    if (error) {
      console.error('Error inserting lightning prompts:', error);
      return;
    }

    console.log(`Successfully inserted ${data.length} lightning prompts`);
    console.log('Lightning prompts populated successfully!');
    
  } catch (error) {
    console.error('Error in populateLightningPrompts:', error);
  }
}

// Run the function
populateLightningPrompts().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});