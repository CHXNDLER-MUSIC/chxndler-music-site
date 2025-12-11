#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQL(sql, description) {
  console.log(`\n🔄 ${description}...`);
  
  try {
    // Use the REST API to execute SQL directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Error: ${error}`);
      return false;
    }
    
    console.log(`✅ ${description} completed`);
    return true;
  } catch (err) {
    console.error(`❌ Failed: ${err.message}`);
    
    // Try alternative approach with direct query
    try {
      const { data, error } = await supabase
        .from('dummy')
        .select('*')
        .limit(0);
      
      // If we get here, we can try a direct SQL execution approach
      console.log('Trying alternative SQL execution...');
      
      // For orders table migration, let's check if columns exist first
      if (description.includes('orders table')) {
        const { data: columns } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'orders');
        
        console.log('Current orders columns:', columns?.map(c => c.column_name) || []);
      }
      
    } catch (altErr) {
      console.error('Alternative approach also failed:', altErr.message);
    }
    
    return false;
  }
}

async function main() {
  console.log('🚀 Running Database Migrations Directly...\n');
  
  // Read the SQL files
  const ordersSQL = fs.readFileSync(path.join(__dirname, 'sql', 'update_orders_table_for_merch.sql'), 'utf8');
  const rpcSQL = fs.readFileSync(path.join(__dirname, 'sql', 'purchase_item_with_heartcoins_merch.sql'), 'utf8');
  
  // Run migrations
  const success1 = await runSQL(ordersSQL, 'Updating orders table for merch');
  const success2 = await runSQL(rpcSQL, 'Creating purchase RPC function');
  
  if (success1 && success2) {
    console.log('\n🎉 Migrations completed successfully!');
  } else {
    console.log('\n⚠️ Some migrations may have failed, but let\'s test the current state...');
  }
  
  // Test current orders table structure
  try {
    console.log('\n🔍 Testing orders table...');
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Orders table error:', error.message);
    } else {
      console.log('✅ Orders table is accessible');
    }
  } catch (err) {
    console.log('Orders table test failed:', err.message);
  }
}

main().catch(console.error);