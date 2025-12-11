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

async function runMigration(filename) {
  console.log(`\n🔄 Running migration: ${filename}`);
  
  try {
    const sqlPath = path.join(__dirname, '..', 'sql', filename);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Error in ${filename}:`, error);
      return false;
    }
    
    console.log(`✅ Successfully ran ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to read or execute ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Running Merch System Database Migrations...\n');
  
  // Run migrations in order
  const migrations = [
    'create_merch_items_table.sql',
    'update_orders_table_for_merch.sql', 
    'purchase_item_with_heartcoins_merch.sql',
    'update_order_shipping.sql'
  ];
  
  let allSuccessful = true;
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      allSuccessful = false;
      break;
    }
  }
  
  if (allSuccessful) {
    console.log('\n🎉 All migrations completed successfully!');
    
    // Test if merch_items table exists and has data
    console.log('\n🔍 Verifying merch_items table...');
    const { data, error } = await supabase
      .from('merch_items')
      .select('id, name, price_heartcoins')
      .limit(5);
    
    if (error) {
      console.error('❌ Error querying merch_items:', error);
    } else {
      console.log(`✅ Found ${data.length} merch items in database`);
      if (data.length > 0) {
        console.log('Sample items:');
        data.forEach(item => console.log(`  - ${item.name}: ${item.price_heartcoins} HeartCoins`));
      }
    }
  } else {
    console.log('\n❌ Migration failed. Please check the errors above.');
    process.exit(1);
  }
}

main().catch(console.error);