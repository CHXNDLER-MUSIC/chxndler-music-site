const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

// Use anon key like the frontend does
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignalSignups() {
  try {
    console.log('Testing phone_signups table...');
    
    // First, try to query the table structure
    console.log('Checking table structure...');
    const { data: structureData, error: structureError } = await supabase
      .from('phone_signups')
      .select('*')
      .limit(0);
      
    if (structureError) {
      console.error('Error querying table structure:', structureError);
    } else {
      console.log('Table structure query successful');
    }
    
    // Try to insert a test record with different possible column names
    const testPhone = 'test123';
    
    // Try different column name variations
    const columnVariations = [
      { phone: testPhone },
      { phone_number: testPhone },
      { number: testPhone },
      { email: testPhone } // Sometimes phone fields are named email
    ];
    
    let data, error;
    let successfulColumn = null;
    
    for (const [index, columnData] of columnVariations.entries()) {
      console.log(`Trying column variation ${index + 1}:`, Object.keys(columnData)[0]);
      
      const result = await supabase
        .from('phone_signups')
        .insert(columnData)
        .select();
      
      if (!result.error) {
        data = result.data;
        error = null;
        successfulColumn = Object.keys(columnData)[0];
        console.log(`Success with column: ${successfulColumn}`);
        break;
      } else {
        console.log(`Failed with column ${Object.keys(columnData)[0]}:`, result.error.message);
        if (index === columnVariations.length - 1) {
          error = result.error;
        }
      }
    }
    
    if (error) {
      console.error('All column variations failed. Last error:', error);
      
      // Check if it's a table not found error
      if (error.code === 'PGRST106' || error.message.includes('relation "public.signal_signups" does not exist')) {
        console.log('Table does not exist. Please create it manually in Supabase dashboard.');
        console.log('SQL to create table:');
        console.log(`
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
CREATE POLICY "Allow anonymous inserts"
  ON public.signal_signups
  FOR INSERT
  TO anon
  WITH CHECK (true);
        `);
      }
      return;
    }
    
    console.log(`Insert successful with column '${successfulColumn}':`, data);
    
    // Clean up test record
    if (data && data[0]) {
      const { error: deleteError } = await supabase
        .from('phone_signups')
        .delete()
        .eq('id', data[0].id);
      
      if (deleteError) {
        console.warn('Could not delete test record:', deleteError);
      } else {
        console.log('Test record cleaned up');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testSignalSignups().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});