#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrders() {
  try {
    console.log('🔍 Checking orders table...');
    
    // Get recent orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (ordersError) {
      console.error('❌ Orders query failed:', ordersError);
      return;
    }
    
    console.log(`📋 Found ${orders.length} recent orders:`);
    orders.forEach((order, i) => {
      console.log(`\n${i + 1}. Order ID: ${order.id}`);
      console.log(`   User: ${order.user_id}`);
      console.log(`   Item: ${order.item_name || order.item_id}`);
      console.log(`   Merch Item ID: ${order.merch_item_id || 'N/A'}`);
      console.log(`   HeartCoins: ${order.total_heartcoins || order.price_heartcoins || 'N/A'}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${order.created_at}`);
    });
    
    // Check columns structure
    console.log('\n📊 Checking table structure...');
    const { data: columns, error: colError } = await supabase
      .rpc('exec_sql', { sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position;" });
      
    if (colError) {
      console.log('⚠️ Could not check table structure:', colError.message);
    } else {
      console.log('Orders table columns:', columns);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkOrders();