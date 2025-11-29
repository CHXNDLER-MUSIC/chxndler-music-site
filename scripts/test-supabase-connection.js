const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Connection error:', error);
      return;
    }
    
    console.log('Connection successful!');
    
    // Check if soul_prompts table exists
    const { data: tableData, error: tableError } = await supabase
      .from('soul_prompts')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.log('soul_prompts table does not exist:', tableError.message);
      
      // Create the table using raw SQL
      console.log('Creating soul_prompts table...');
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.soul_prompts (
          id uuid primary key default gen_random_uuid(),
          prompt_type text not null check (prompt_type in ('intention', 'reflection')),
          element text not null check (element in ('heart', 'water', 'lightning', 'darkness')),
          text text not null,
          sort_order integer,
          created_at timestamptz not null default now()
        );
        
        ALTER TABLE public.soul_prompts ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "allow_soul_prompts_select_all"
          ON public.soul_prompts FOR SELECT
          USING (true);
          
        CREATE POLICY IF NOT EXISTS "service_role_can_manage_soul_prompts"
          ON public.soul_prompts FOR ALL TO service_role
          USING (true)
          WITH CHECK (true);
      `;
      
      // Execute using the REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql: createTableSQL })
      });
      
      if (!response.ok) {
        console.error('Failed to create table via REST API');
        // Try different approach - create manually through direct insert
        await createTableViaInserts();
      } else {
        console.log('Table created successfully via REST API');
      }
    } else {
      console.log('soul_prompts table already exists');
    }
    
    // Now try to populate lightning prompts
    await populateLightningPrompts();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function createTableViaInserts() {
  console.log('Attempting manual table creation...');
  // Since we can't execute raw SQL, we'll need to use the Supabase dashboard or CLI
  console.log('Please create the soul_prompts table manually in Supabase dashboard with this schema:');
  console.log(`
    CREATE TABLE IF NOT EXISTS public.soul_prompts (
      id uuid primary key default gen_random_uuid(),
      prompt_type text not null check (prompt_type in ('intention', 'reflection')),
      element text not null check (element in ('heart', 'water', 'lightning', 'darkness')),
      text text not null,
      sort_order integer,
      created_at timestamptz not null default now()
    );
  `);
}

async function populateLightningPrompts() {
  console.log('Populating Lightning element prompts...');
  
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
    }
  ];
  
  try {
    // Check if prompts already exist
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

    // Insert prompts
    const { data, error } = await supabase
      .from('soul_prompts')
      .insert(lightningPrompts)
      .select();

    if (error) {
      console.error('Error inserting lightning prompts:', error);
      return;
    }

    console.log(`Successfully inserted ${data.length} lightning prompts`);
    
  } catch (error) {
    console.error('Error in populateLightningPrompts:', error);
  }
}

// Run the test
testConnection().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});