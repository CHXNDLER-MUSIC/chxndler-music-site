const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables - need service role key');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSignalSignupsTable() {
  try {
    console.log('Creating signal_signups table with service role...');
    
    // Use raw SQL to create the table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Signal Signups table for anonymous phone number collection
        CREATE TABLE IF NOT EXISTS public.signal_signups (
          id uuid primary key default gen_random_uuid(),
          phone text not null,
          created_at timestamptz default now()
        );

        -- Enable Row Level Security
        ALTER TABLE public.signal_signups ENABLE ROW LEVEL SECURITY;

        -- Grant permissions for anonymous inserts
        GRANT USAGE ON SCHEMA public TO anon;
        GRANT INSERT ON TABLE public.signal_signups TO anon;

        -- Policy to allow anonymous inserts
        DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.signal_signups;
        CREATE POLICY "Allow anonymous inserts"
          ON public.signal_signups
          FOR INSERT
          TO anon
          WITH CHECK (true);
      `
    });
    
    if (error) {
      console.error('Error creating table:', error);
      
      // Fallback: try using direct table creation
      console.log('Fallback: trying direct table creation...');
      const { error: createError } = await supabase
        .schema('public')
        .from('_schema')
        .insert({
          table_name: 'signal_signups',
          columns: [
            { name: 'id', type: 'uuid', default: 'gen_random_uuid()', primary_key: true },
            { name: 'phone', type: 'text', not_null: true },
            { name: 'created_at', type: 'timestamptz', default: 'now()' }
          ]
        });
        
      if (createError) {
        console.error('Direct creation also failed:', createError);
      }
      
    } else {
      console.log('Table created successfully:', data);
    }
    
    // Test the table
    console.log('Testing the table...');
    const { data: testData, error: testError } = await supabase
      .from('signal_signups')
      .insert({ phone: 'test12345' })
      .select();
    
    if (testError) {
      console.error('Test insert failed:', testError);
    } else {
      console.log('Test insert successful:', testData);
      
      // Clean up
      if (testData && testData[0]) {
        await supabase
          .from('signal_signups')
          .delete()
          .eq('id', testData[0].id);
        console.log('Test record cleaned up');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the creation
createSignalSignupsTable().then(() => {
  console.log('Creation completed');
  process.exit(0);
}).catch(error => {
  console.error('Creation failed:', error);
  process.exit(1);
});