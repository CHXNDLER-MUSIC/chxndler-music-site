#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PREDEFINED_BADGES = [
  {
    badge_name: 'Soul Star',
    description: 'Your first reflection in the Heartverse - where your soul journey begins.',
    requirement: 'Complete 1 reflection',
    icon_url: '/badges/soul star.webp'
  },
  {
    badge_name: 'First Listen',
    description: 'The first note that touched your heart in the Heartverse.',
    requirement: 'Listen to 1 track',
    icon_url: '/badges/listening.webp'
  },
  {
    badge_name: 'Collector',
    description: 'Your journey into collecting digital memories begins.',
    requirement: 'Collect 1 digital card',
    icon_url: '/badges/collector.webp'
  },
  {
    badge_name: 'Lightning Element',
    description: 'Harness the power of lightning in your journey.',
    requirement: 'Unlock lightning element',
    icon_url: '/badges/elemental streak.webp'
  },
  {
    badge_name: 'First HeartCoin',
    description: 'Your first currency in the Heartverse economy.',
    requirement: 'Earn 1 HeartCoin',
    icon_url: '/badges/currency.webp'
  },
  {
    badge_name: 'Community Builder',
    description: 'Welcome your first soul to the Heartverse.',
    requirement: 'Invite 1 friend',
    icon_url: '/badges/community.webp'
  },
  // Soul Star progression
  {
    badge_name: 'Soul Ember',
    description: 'Your soul flame grows stronger with each reflection.',
    requirement: 'Complete 3 reflections',
    icon_url: '/badges/soul star.webp'
  },
  {
    badge_name: 'Soul Flame',
    description: 'Your inner light burns brighter in the Heartverse.',
    requirement: 'Complete 7 reflections',
    icon_url: '/badges/soul star.webp'
  },
  {
    badge_name: 'Soul Bloom',
    description: 'Your soul blossoms with wisdom and understanding.',
    requirement: 'Complete 14 reflections',
    icon_url: '/badges/soul star.webp'
  },
  // Listening badges
  {
    badge_name: 'Deep Listener',
    description: 'You ve discovered the depths of musical exploration.',
    requirement: 'Listen to 10 unique tracks',
    icon_url: '/badges/listening.webp'
  },
  {
    badge_name: 'Music Explorer',
    description: 'Your ears have touched many musical realms.',
    requirement: 'Listen to 25 unique tracks',
    icon_url: '/badges/listening.webp'
  },
  // Achievement badges
  {
    badge_name: 'Digital Archivist',
    description: 'You understand the value of digital memories.',
    requirement: 'Collect 5 digital cards',
    icon_url: '/badges/collector.webp'
  },
  {
    badge_name: 'Memory Keeper',
    description: 'Guardian of precious digital moments.',
    requirement: 'Collect 10 digital cards',
    icon_url: '/badges/collector.webp'
  },
  // Elemental badges
  {
    badge_name: 'Water Element',
    description: 'Flow like water, adapt like the ocean.',
    requirement: 'Unlock water element',
    icon_url: '/badges/elemental streak.webp'
  },
  {
    badge_name: 'Fire Element',
    description: 'Ignite your passion, burn bright.',
    requirement: 'Unlock fire element',
    icon_url: '/badges/elemental streak.webp'
  },
  // HeartCoin badges
  {
    badge_name: 'Coin Collector',
    description: 'Your wealth in the Heartverse grows.',
    requirement: 'Earn 10 HeartCoins',
    icon_url: '/badges/currency.webp'
  },
  {
    badge_name: 'Heart Prosperity',
    description: 'Abundance flows through your digital wallet.',
    requirement: 'Earn 50 HeartCoins',
    icon_url: '/badges/currency.webp'
  },
  // Community badges
  {
    badge_name: 'Portal Opener',
    description: 'You ve opened portals for others to join.',
    requirement: 'Invite 3 friends',
    icon_url: '/badges/community.webp'
  },
  {
    badge_name: 'Heartverse Ambassador',
    description: 'A true ambassador of the Heartverse community.',
    requirement: 'Invite 10 friends',
    icon_url: '/badges/community.webp'
  }
];

async function syncBadges() {
  console.log('🔄 Starting badge synchronization...');

  try {
    // First, check what badges currently exist
    console.log('\n📊 Checking existing badges...');
    const { data: existingBadges, error: fetchError } = await supabase
      .from('badges')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching existing badges:', fetchError);
      return;
    }

    console.log(`   Found ${existingBadges.length} existing badges`);
    
    if (existingBadges.length > 0) {
      console.log('\n   Existing badges:');
      existingBadges.forEach((badge, index) => {
        console.log(`   ${index + 1}. ${badge.badge_name} - ${badge.description}`);
      });
    }

    // Create a map of existing badge names for comparison
    const existingBadgeNames = new Set(existingBadges.map(b => b.badge_name));

    // Find badges that need to be added
    const badgesToAdd = PREDEFINED_BADGES.filter(badge => !existingBadgeNames.has(badge.badge_name));
    
    if (badgesToAdd.length === 0) {
      console.log('\n✅ All predefined badges already exist in database!');
      console.log('\n🔍 Badge categories breakdown:');
      
      // Show breakdown by category
      const categories = {
        'Soul Star': existingBadges.filter(b => b.badge_name.toLowerCase().includes('soul')),
        'Listening': existingBadges.filter(b => 
          b.badge_name.toLowerCase().includes('listen') || 
          b.badge_name.toLowerCase().includes('music') ||
          b.badge_name.toLowerCase().includes('track')
        ),
        'Achievements': existingBadges.filter(b => 
          b.badge_name.toLowerCase().includes('collect') || 
          b.badge_name.toLowerCase().includes('archivist') ||
          b.badge_name.toLowerCase().includes('memory')
        ),
        'Elemental': existingBadges.filter(b => 
          b.badge_name.toLowerCase().includes('element') ||
          b.badge_name.toLowerCase().includes('lightning') ||
          b.badge_name.toLowerCase().includes('water') ||
          b.badge_name.toLowerCase().includes('fire')
        ),
        'HeartCoin': existingBadges.filter(b => 
          b.badge_name.toLowerCase().includes('coin') || 
          b.badge_name.toLowerCase().includes('prosperity')
        ),
        'Community': existingBadges.filter(b => 
          b.badge_name.toLowerCase().includes('community') || 
          b.badge_name.toLowerCase().includes('invite') ||
          b.badge_name.toLowerCase().includes('portal') ||
          b.badge_name.toLowerCase().includes('ambassador')
        )
      };

      Object.entries(categories).forEach(([category, badges]) => {
        console.log(`   ${category}: ${badges.length} badges`);
      });

      return;
    }

    console.log(`\n➕ Adding ${badgesToAdd.length} new badges...`);

    // Insert new badges
    for (const badge of badgesToAdd) {
      console.log(`   Adding: ${badge.badge_name}`);
      const { error } = await supabase
        .from('badges')
        .insert([badge]);

      if (error) {
        console.error(`   ❌ Error adding badge "${badge.badge_name}":`, error);
      } else {
        console.log(`   ✅ Added: ${badge.badge_name}`);
      }
    }

    // Final verification
    console.log('\n🔍 Final badge count...');
    const { data: finalBadges, error: finalError } = await supabase
      .from('badges')
      .select('*');

    if (finalError) {
      console.error('❌ Error in final verification:', finalError);
    } else {
      console.log(`✅ Total badges in database: ${finalBadges.length}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error during badge sync:', error);
  }
}

// Check if we're running this script directly
if (require.main === module) {
  syncBadges().then(() => {
    console.log('\n🎉 Badge synchronization complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Badge synchronization failed:', error);
    process.exit(1);
  });
}

module.exports = { syncBadges, PREDEFINED_BADGES };