import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAlienValidation() {
  console.log('🧪 Testing ALIEN phrase validation...\n');
  
  const today = new Date().toISOString().split('T')[0];
  console.log('📅 Today:', today);
  
  // Step 1: Verify the phrase exists and is active
  console.log('\n1️⃣ Checking database directly...');
  const { data: phrases, error: phrasesError } = await supabase
    .from('secret_phrases')
    .select('*')
    .ilike('secret_phrase', 'ALIEN')
    .eq('active_date', today)
    .eq('is_active', true);
  
  if (phrasesError) {
    console.error('❌ Database error:', phrasesError);
    return;
  }
  
  console.log(`Found ${phrases?.length || 0} active ALIEN phrases for today`);
  phrases?.forEach((phrase, i) => {
    console.log(`  ${i + 1}. "${phrase.secret_phrase}" - ID: ${phrase.id}, Reward: ${phrase.reward}, Context: ${phrase.context || 'N/A'}`);
  });
  
  if (!phrases || phrases.length === 0) {
    console.log('❌ No active ALIEN phrase found in database');
    return;
  }
  
  // Step 2: Test different case variations
  console.log('\n2️⃣ Testing case variations...');
  const testCases = ['ALIEN', 'alien', 'Alien', 'ALiEn'];
  
  for (const testCase of testCases) {
    const { data: caseTest } = await supabase
      .from('secret_phrases')
      .select('*')
      .ilike('secret_phrase', testCase)
      .eq('active_date', today)
      .eq('is_active', true);
    
    console.log(`  "${testCase}": ${caseTest?.length || 0} matches`);
  }
  
  // Step 3: Check if there are any context restrictions
  console.log('\n3️⃣ Checking all ALIEN phrases...');
  const { data: allAlienPhrases } = await supabase
    .from('secret_phrases')
    .select('*')
    .ilike('secret_phrase', 'ALIEN');
  
  allAlienPhrases?.forEach((phrase, i) => {
    console.log(`  ${i + 1}. "${phrase.secret_phrase}" - Context: ${phrase.context || 'global'}, Date: ${phrase.active_date}, Active: ${phrase.is_active}`);
  });
  
  // Step 4: Test the exact API call that would be made
  console.log('\n4️⃣ Testing API call simulation...');
  
  // Check if there's an API endpoint we can test
  try {
    const response = await fetch('http://localhost:3000/api/redeem-secret-phrase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phrase: 'ALIEN',
        context: 'global'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('API Response:', result);
    } else {
      console.log('API Error:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('Could not test API (server may not be running):', error.message);
  }
}

testAlienValidation().catch(console.error);