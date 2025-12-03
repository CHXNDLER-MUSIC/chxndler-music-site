const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function testHeartCoinTable() {
  try {
    console.log('Checking heartcoin_transactions table...');

    const { data, error } = await supabaseClient
      .from('heartcoin_transactions')
      .select('id')
      .limit(1);

    if (error) {
      console.log('❌ heartcoin_transactions table error:', error.message);
      
      // Check if there are other heartcoin-related tables
      const { data: profilesData, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('heartcoin_balance, heartcoin_total')
        .limit(1);
      
      if (profilesError) {
        console.log('❌ profiles heartcoin columns error:', profilesError.message);
      } else {
        console.log('✅ profiles table has heartcoin columns');
      }
      
      return false;
    }

    console.log('✅ heartcoin_transactions table exists and is accessible');
    return true;

  } catch (error) {
    console.error('Error testing heartcoin table:', error);
    return false;
  }
}

testHeartCoinTable();