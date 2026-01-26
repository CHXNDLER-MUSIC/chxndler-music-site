const { createClient } = require('@supabase/supabase-js');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Badge requirement mappings
const badgeRequirements = {
  // Collector badges
  'Collector': { requirement_type: 'digital_cards_owned', requirement_count: 1, category: 'collector' },
  'Digital Archivist': { requirement_type: 'digital_cards_owned', requirement_count: 5, category: 'collector' },
  'Memory Keeper': { requirement_type: 'digital_cards_owned', requirement_count: 10, category: 'collector' },
  
  // HeartCoin badges
  'Coin Collector': { requirement_type: 'heartcoins', requirement_count: 100, category: 'currency' },
  'First Coin': { requirement_type: 'heartcoins', requirement_count: 1, category: 'currency' },
  'First HeartCoin': { requirement_type: 'heartcoins', requirement_count: 1, category: 'currency' },
  'Treasure Keeper': { requirement_type: 'heartcoins', requirement_count: 1000, category: 'currency' },
  'Heart Prosperity': { requirement_type: 'heartcoins', requirement_count: 1000, category: 'currency' },
  
  // Community badges (ordered by requirement_count)
  'Portal Opener': { requirement_type: 'aliens_invited', requirement_count: 1, category: 'community' },
  'Community Builder': { requirement_type: 'community_interactions', requirement_count: 1, category: 'community' },
  'Live Witness': { requirement_type: 'livestreams_attended', requirement_count: 1, category: 'community' },
  'First Contact': { requirement_type: 'concerts_attended', requirement_count: 1, category: 'community' },
  'Community Leader': { requirement_type: 'community_interactions', requirement_count: 3, category: 'community' },
  'Friend Maker': { requirement_type: 'community_interactions', requirement_count: 5, category: 'community' },
  'Heartverse Ambassador': { requirement_type: 'aliens_invited', requirement_count: 25, category: 'community' },
  
  // Elemental badges
  'Lightning Element': { requirement_type: 'elemental_sessions', requirement_count: 1, category: 'elemental-streak' },
  'Heart Element': { requirement_type: 'elemental_sessions', requirement_count: 1, category: 'elemental-streak' },
  'Water Element': { requirement_type: 'elemental_sessions', requirement_count: 1, category: 'elemental-streak' },
  'Fire Element': { requirement_type: 'elemental_sessions', requirement_count: 1, category: 'elemental-streak' },
  'Darkness Element': { requirement_type: 'elemental_sessions', requirement_count: 1, category: 'elemental-streak' },
  
  // Listening badges
  'First Listen': { requirement_type: 'listen', requirement_count: 1, category: 'listening' },
  'Deep Listener': { requirement_type: 'listen', requirement_count: 10, category: 'listening' },
  'Music Explorer': { requirement_type: 'listen', requirement_count: 25, category: 'listening' },
  'Song Keeper': { requirement_type: 'listening_time', requirement_count: 60, category: 'listening' },
  'Melody Master': { requirement_type: 'listening_time', requirement_count: 600, category: 'listening' },
};

async function updateBadgeRequirements() {
  console.log('🔧 Updating badge requirements...');
  
  try {
    // Get all badges
    const { data: badges, error } = await supabase
      .from('badges')
      .select('id, badge_name, requirement_type, requirement_count, category, slug');
    
    if (error) {
      console.error('❌ Error fetching badges:', error);
      return;
    }
    
    console.log(`📊 Found ${badges.length} badges total`);
    
    // Update badges that need fixing
    let updatedCount = 0;
    
    for (const badge of badges) {
      const badgeName = badge.badge_name;
      const requirements = badgeRequirements[badgeName];
      
      if (requirements && (!badge.requirement_type || !badge.category)) {
        console.log(`🔧 Updating ${badgeName}...`);
        
        // Generate slug if missing
        const slug = badge.slug || badgeName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
        
        const { error: updateError } = await supabase
          .from('badges')
          .update({
            requirement_type: requirements.requirement_type,
            requirement_count: requirements.requirement_count,
            category: requirements.category,
            slug: slug
          })
          .eq('id', badge.id);
        
        if (updateError) {
          console.error(`❌ Error updating ${badgeName}:`, updateError);
        } else {
          console.log(`✅ Updated ${badgeName}`);
          updatedCount++;
        }
      }
    }
    
    console.log(`🎉 Successfully updated ${updatedCount} badges`);
    
    // Show final status
    const { data: finalBadges } = await supabase
      .from('badges')
      .select('badge_name, requirement_type, requirement_count, category')
      .order('category', { ascending: true })
      .order('badge_name', { ascending: true });
    
    console.log('\n📊 Final badge status:');
    const groupedBadges = {};
    finalBadges.forEach(badge => {
      const category = badge.category || 'uncategorized';
      if (!groupedBadges[category]) groupedBadges[category] = [];
      groupedBadges[category].push(badge);
    });
    
    Object.keys(groupedBadges).forEach(category => {
      console.log(`\n${category.toUpperCase()}:`);
      groupedBadges[category].forEach(badge => {
        console.log(`  ${badge.badge_name}: ${badge.requirement_type} (${badge.requirement_count})`);
      });
    });
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

updateBadgeRequirements().then(() => {
  console.log('\n🎉 Badge requirements update completed');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});