#!/usr/bin/env node

// Test script to debug purchase API
const { default: fetch } = await import('node-fetch');

async function testPurchase() {
  try {
    console.log('🔍 Testing merch purchase API...');
    
    // Get an auth token (we'll use a test ID)
    const testUserId = '78cb1b94-2a4c-4681-b4bb-c4ac8eced86b';
    const testMerchId = '214c10af-ed40-4856-b3f5-6433db3c1428';
    
    // First check what merch items are available
    console.log('\n📦 Fetching merch items...');
    const itemsResponse = await fetch('http://localhost:3000/api/merch/items?category=physical');
    const itemsData = await itemsResponse.json();
    
    console.log('Available items:', itemsData.data?.length || 0);
    if (itemsData.data?.length > 0) {
      const firstItem = itemsData.data[0];
      console.log('First item:', {
        id: firstItem.id,
        name: firstItem.name,
        price_heartcoins: firstItem.price_heartcoins
      });
      
      // Now test the purchase
      console.log('\n💰 Testing purchase...');
      const purchaseResponse = await fetch('http://localhost:3000/api/merch/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sb-access-token=test' // This will fail but let's see the response
        },
        body: JSON.stringify({
          merchItemId: firstItem.id,
          quantity: 1
        })
      });
      
      const purchaseData = await purchaseResponse.json();
      console.log('Purchase response status:', purchaseResponse.status);
      console.log('Purchase response:', JSON.stringify(purchaseData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPurchase();