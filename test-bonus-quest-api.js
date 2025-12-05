const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function testBonusQuestAPI() {
  try {
    console.log('Testing bonus quest completion API...');

    // First get a session (you'd need to be logged in for this to work)
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
      console.log('No active session - you need to be logged in to test quest completion');
      console.log('The API structure is ready, but authentication is required');
      return;
    }

    console.log('User authenticated:', session.user.email);

    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/bonus-quests/complete', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ questKey: 'INVITE_FRIEND' })
    });

    const result = await response.json();
    console.log('API Response:', result);

    if (response.ok) {
      console.log('✅ Quest completion API is working!');
    } else {
      console.log('❌ Quest completion failed:', result.error);
    }

  } catch (error) {
    console.error('Error testing bonus quest API:', error);
  }
}

if (require.main === module) {
  testBonusQuestAPI();
}

module.exports = { testBonusQuestAPI };