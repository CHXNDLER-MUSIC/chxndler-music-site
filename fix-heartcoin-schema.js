const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function runSQLFix() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables:');
    console.error('SUPABASE_URL:', supabaseUrl ? 'present' : 'missing');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'present' : 'missing');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  console.log('🔧 Running heartcoin_transactions schema fix...');

  try {
    // Try to query the table with description column to see what happens
    console.log('🔍 Testing heartcoin_transactions table access...');
    
    const { data, error } = await supabase
      .from('heartcoin_transactions')
      .select('id, user_id, amount, transaction_type, description')
      .limit(1);
    
    if (error) {
      console.error('❌ Error querying heartcoin_transactions:', error);
      
      if (error.message.includes("description")) {
        console.log('\n🎯 CONFIRMED: The description column is missing from heartcoin_transactions table');
        console.log('\n📝 Please run the following SQL in your Supabase SQL Editor:');
        console.log('\n' + '='.repeat(50));
        console.log(fs.readFileSync('./FIX_HEARTCOIN_TRANSACTIONS_SCHEMA.sql', 'utf8'));
        console.log('='.repeat(50));
      } else if (error.message.includes("does not exist")) {
        console.log('\n❌ The heartcoin_transactions table does not exist');
        console.log('\n📝 Please run the following SQL in your Supabase SQL Editor:');
        console.log('\n' + '='.repeat(50));
        console.log(fs.readFileSync('./sql/store_tables.sql', 'utf8'));
        console.log('='.repeat(50));
      }
    } else {
      console.log('✅ heartcoin_transactions table is working correctly!');
      if (data) {
        console.log(`Found ${data.length} existing transactions`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

runSQLFix().catch(console.error);