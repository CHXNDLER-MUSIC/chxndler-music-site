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

async function checkRecentOrders() {
  try {
    console.log('🔍 Checking orders from the last hour...');
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // Get recent orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('❌ Orders query failed:', ordersError);
      return;
    }
    
    console.log(`📋 Found ${orders.length} orders in the last hour:`);
    orders.forEach((order, i) => {
      console.log(`\n${i + 1}. Order ID: ${order.id}`);
      console.log(`   User: ${order.user_id}`);
      console.log(`   Item: ${order.item_name || order.item_id}`);
      console.log(`   Merch Item ID: ${order.merch_item_id || 'N/A'}`);
      console.log(`   HeartCoins: ${order.total_heartcoins || order.price_heartcoins || 'N/A'}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${order.created_at}`);
    });
    
    // Also check for beanie specifically
    const { data: beanieOrders, error: beanieError } = await supabase
      .from('orders')
      .select('*')
      .ilike('item_name', '%beanie%')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!beanieError && beanieOrders.length > 0) {
      console.log(`\n🧢 Found ${beanieOrders.length} beanie orders (all time):`);
      beanieOrders.forEach((order, i) => {
        console.log(`\n${i + 1}. Beanie Order ID: ${order.id}`);
        console.log(`   User: ${order.user_id}`);
        console.log(`   HeartCoins: ${order.total_heartcoins || order.price_heartcoins || 'N/A'}`);
        console.log(`   Created: ${order.created_at}`);
      });
    } else {
      console.log('\n🧢 No beanie orders found');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkRecentOrders();