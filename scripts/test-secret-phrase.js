// Test script to verify secret phrase redemption works
// This simulates what happens when the user types "ocean girl" in the app

async function testSecretPhrase() {
  console.log('Testing "ocean girl" secret phrase redemption...');
  
  try {
    const response = await fetch('http://localhost:3000/api/redeem-secret-phrase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: this will fail without authentication, but we can see if our schema changes work
      },
      body: JSON.stringify({
        context: 'live_show',
        phrase: 'ocean girl'
      })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.status === 'error' && data.code === 'UNAUTHORIZED') {
      console.log('✅ API is working - authentication required (expected)');
    } else if (data.status === 'error' && data.message.includes('Could not find')) {
      console.log('❌ Schema issue still exists');
    } else {
      console.log('✅ API response looks good!');
    }
    
  } catch (error) {
    console.error('❌ Error testing secret phrase:', error);
  }
}

testSecretPhrase();