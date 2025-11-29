const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
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

async function setupSoulTables() {
  try {
    console.log('Setting up soul tables...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('setup-soul-tables.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Error setting up tables:', error);
      // Try alternative approach using individual queries
      console.log('Trying alternative setup approach...');
      await setupTablesAlternative();
      return;
    }
    
    console.log('Tables setup successfully!');
    
  } catch (error) {
    console.error('Error in setupSoulTables:', error);
    // Try alternative approach
    console.log('Trying alternative setup approach...');
    await setupTablesAlternative();
  }
}

async function setupTablesAlternative() {
  try {
    // Create soul_prompts table
    const createPromptsTable = `
      CREATE TABLE IF NOT EXISTS public.soul_prompts (
        id uuid primary key default gen_random_uuid(),
        prompt_type text not null check (prompt_type in ('intention', 'reflection')),
        element text not null check (element in ('heart', 'water', 'lightning', 'darkness')),
        text text not null,
        sort_order integer,
        created_at timestamptz not null default now()
      );
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createPromptsTable });
    if (createError) {
      console.error('Error creating soul_prompts table:', createError);
    } else {
      console.log('soul_prompts table created successfully');
    }
    
    // Enable RLS
    const enableRLS = `
      ALTER TABLE public.soul_prompts ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY IF NOT EXISTS "allow_soul_prompts_select_all"
        ON public.soul_prompts FOR SELECT
        USING (true);
    `;
    
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: enableRLS });
    if (rlsError) {
      console.error('Error setting up RLS:', rlsError);
    } else {
      console.log('RLS policies created successfully');
    }
    
  } catch (error) {
    console.error('Error in setupTablesAlternative:', error);
  }
}

// Run the setup
setupSoulTables().then(() => {
  console.log('Setup completed');
  process.exit(0);
}).catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});