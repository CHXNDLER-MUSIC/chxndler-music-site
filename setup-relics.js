const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Setting up relics table...');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Relic data from assets.ts
const relics = [
  { relic_name: 'CHXNDLER Pattern 2', icon_url: '/relics/2_CHXNDLER-Pattern.webp', description: 'A mystical pattern relic displaying the sacred geometry of CHXNDLER\'s cosmic design.' },
  { relic_name: 'CHXNDLER Pattern 4', icon_url: '/relics/4_CHXNDLER-Pattern.webp', description: 'An intricate pattern relic revealing deeper layers of the CHXNDLER universe.' },
  { relic_name: 'CHXNDLER Pattern 6', icon_url: '/relics/6_CHXNDLER-Pattern.webp', description: 'A complex pattern relic embodying the harmony of six elemental forces.' },
  { relic_name: 'CHXNDLER Pattern 8', icon_url: '/relics/8_CHXNDLER-Pattern.webp', description: 'The most sophisticated pattern relic, representing infinite possibilities.' },
  { relic_name: 'Alien - Blue', icon_url: '/relics/Alien - Blue (Transparent).webp', description: 'A crystalline blue alien artifact from the cosmic depths of space.' },
  { relic_name: 'Alien - Pink', icon_url: '/relics/Alien - Pink (Transparent).webp', description: 'A radiant pink alien artifact pulsing with otherworldly energy.' },
  { relic_name: 'Relic 1', icon_url: '/relics/1.webp', description: 'The first discovered relic, marking the beginning of your cosmic journey.' },
  { relic_name: 'Relic 2', icon_url: '/relics/2.webp', description: 'The second ancient relic, deepening your connection to the universe.' },
  { relic_name: 'Relic 3', icon_url: '/relics/3.webp', description: 'The third sacred relic, unlocking new levels of cosmic understanding.' },
  // Add more relics to get to 16 total
  { relic_name: 'Crystal Heart', icon_url: '/relics/1.webp', description: 'A luminous crystal heart that pulses with pure emotional energy.' },
  { relic_name: 'Cosmic Key', icon_url: '/relics/2.webp', description: 'An ancient key that opens doorways between dimensions.' },
  { relic_name: 'Star Fragment', icon_url: '/relics/3.webp', description: 'A piece of a fallen star, still glowing with celestial power.' },
  { relic_name: 'Void Orb', icon_url: '/relics/Alien - Blue (Transparent).webp', description: 'A mysterious orb that contains the essence of empty space.' },
  { relic_name: 'Phoenix Feather', icon_url: '/relics/Alien - Pink (Transparent).webp', description: 'A feather from the legendary phoenix, symbolizing rebirth and renewal.' },
  { relic_name: 'Moon Shard', icon_url: '/relics/2_CHXNDLER-Pattern.webp', description: 'A fragment of lunar crystal that enhances intuition and dreams.' },
  { relic_name: 'Solar Core', icon_url: '/relics/4_CHXNDLER-Pattern.webp', description: 'The concentrated essence of solar energy, radiating warmth and life.' }
];

async function setupRelics() {
  try {
    // First check if relics table exists by trying to select from it
    console.log('\n🔍 Checking if relics table exists...');
    const { data: existingData, error: checkError } = await supabase
      .from('relics')
      .select('*')
      .limit(1);
    
    if (checkError) {
      if (checkError.code === '42P01') {
        console.log('❌ Relics table does not exist. Creating it...');
        await createRelicsTable();
      } else {
        console.log('❌ Error checking relics table:', checkError.message);
        return;
      }
    } else {
      console.log('✅ Relics table exists');
    }
    
    // Check current count
    const { data: countData, error: countError } = await supabase
      .from('relics')
      .select('*');
      
    if (countError) {
      console.log('❌ Error counting relics:', countError.message);
      return;
    }
    
    const currentCount = countData?.length || 0;
    console.log(`📊 Current relics in database: ${currentCount}`);
    
    if (currentCount === 0) {
      console.log('📦 Inserting relics data...');
      await insertRelics();
    } else {
      console.log('✅ Relics data already exists');
      
      // Show first few relics for verification
      const { data: sampleData } = await supabase
        .from('relics')
        .select('id, relic_name, icon_url')
        .limit(3);
        
      console.log('📷 Sample relics:');
      sampleData?.forEach((relic, i) => {
        console.log(`  ${i + 1}. ${relic.relic_name} -> ${relic.icon_url}`);
      });
    }
    
    // Test fetch to verify it's working
    console.log('\n🧪 Testing relic fetch...');
    const { data: testData, error: testError } = await supabase
      .from('relics')
      .select('id, relic_name, icon_url, description')
      .order('id', { ascending: true });
    
    if (testError) {
      console.log('❌ Error fetching relics:', testError.message);
    } else {
      console.log(`✅ Successfully fetched ${testData?.length || 0} relics`);
      if (testData && testData.length > 0) {
        console.log('🎉 Relics setup complete! The ProfilePopover should now show real relic images.');
      }
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
  }
}

async function createRelicsTable() {
  console.log('🔨 Creating relics table...');
  
  // We'll try to insert data first - if the table doesn't exist, this will fail
  // and we'll know we need to create it via SQL migration
  const { error } = await supabase
    .from('relics')
    .insert(relics.slice(0, 1)); // Try inserting just one first
    
  if (error) {
    console.log('❌ Cannot create table via client. Please run CREATE_RELICS_TABLE.sql manually.');
    console.log('Error:', error.message);
    throw error;
  }
  
  console.log('✅ Table creation test passed');
}

async function insertRelics() {
  const { error } = await supabase
    .from('relics')
    .insert(relics);
    
  if (error) {
    console.error('❌ Error inserting relics:', error.message);
    throw error;
  } else {
    console.log(`✅ Inserted ${relics.length} relics successfully!`);
  }
}

setupRelics();