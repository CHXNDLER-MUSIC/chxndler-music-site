#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBadgeSync() {
  console.log('🔍 Testing badge synchronization...\n');

  try {
    // 1. Test basic badge fetching
    console.log('1️⃣ Fetching all badges from Supabase...');
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .order('created_at', { ascending: true });

    if (badgesError) {
      console.error('❌ Error fetching badges:', badgesError);
      return;
    }

    console.log(`✅ Found ${badges.length} badges in database\n`);

    // 2. Test category distribution
    console.log('2️⃣ Testing badge categorization...');
    
    const categories = {
      'Soul Star': badges.filter(b => 
        b.badge_name.toLowerCase().includes('soul') ||
        b.badge_name.toLowerCase().includes('reflection')
      ),
      'Achievements': badges.filter(b => 
        b.badge_name.toLowerCase().includes('first') ||
        b.badge_name.toLowerCase().includes('collector') ||
        b.badge_name.toLowerCase().includes('archivist') ||
        b.badge_name.toLowerCase().includes('memory')
      ),
      'Listening': badges.filter(b => 
        b.badge_name.toLowerCase().includes('listen') ||
        b.badge_name.toLowerCase().includes('track') ||
        b.badge_name.toLowerCase().includes('song') ||
        b.badge_name.toLowerCase().includes('music')
      ),
      'Elemental Streak': badges.filter(b => 
        b.badge_name.toLowerCase().includes('element') ||
        b.badge_name.toLowerCase().includes('water') ||
        b.badge_name.toLowerCase().includes('fire') ||
        b.badge_name.toLowerCase().includes('lightning')
      ),
      'HeartCoin': badges.filter(b => 
        b.badge_name.toLowerCase().includes('coin') ||
        b.badge_name.toLowerCase().includes('prosperity') ||
        b.badge_name.toLowerCase().includes('earner')
      ),
      'Community': badges.filter(b => 
        b.badge_name.toLowerCase().includes('community') ||
        b.badge_name.toLowerCase().includes('invite') ||
        b.badge_name.toLowerCase().includes('portal') ||
        b.badge_name.toLowerCase().includes('ambassador')
      )
    };

    Object.entries(categories).forEach(([category, categoryBadges]) => {
      console.log(`   ${category}: ${categoryBadges.length} badges`);
      if (categoryBadges.length > 0) {
        categoryBadges.slice(0, 3).forEach(badge => {
          console.log(`     - ${badge.badge_name}`);
        });
        if (categoryBadges.length > 3) {
          console.log(`     ... and ${categoryBadges.length - 3} more`);
        }
      }
    });

    // 3. Verify that the main 6 categories we use in the UI are represented
    console.log('\n3️⃣ Checking essential categories for UI...');
    
    const essentialCategories = [
      'Soul Star',
      'Achievements', 
      'Listening',
      'Elemental Streak',
      'HeartCoin',
      'Community'
    ];

    let allCategoriesHaveBadges = true;
    essentialCategories.forEach(category => {
      const categoryBadges = categories[category];
      if (categoryBadges.length === 0) {
        console.log(`   ⚠️  ${category}: No badges found`);
        allCategoriesHaveBadges = false;
      } else {
        console.log(`   ✅ ${category}: ${categoryBadges.length} badges`);
      }
    });

    if (allCategoriesHaveBadges) {
      console.log('\n🎉 All essential badge categories are populated!');
    } else {
      console.log('\n⚠️  Some essential categories need more badges');
    }

    // 4. Test a sample user badge query (without a real user)
    console.log('\n4️⃣ Testing user badge query structure...');
    const { error: userBadgeError } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .limit(1);

    if (userBadgeError) {
      console.log(`   ⚠️  User badge query structure has issues: ${userBadgeError.message}`);
    } else {
      console.log('   ✅ User badge query structure is valid');
    }

  } catch (error) {
    console.error('❌ Unexpected error during badge sync test:', error);
  }

  console.log('\n✨ Badge synchronization test completed!');
}

// Run the test
testBadgeSync().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Badge sync test failed:', error);
  process.exit(1);
});