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

async function checkAndFixBadgesSchema() {
  console.log('🔍 Checking badges table structure...');
  
  // First, let's check if the structured fields exist by trying to select them
  try {
    const { data, error } = await supabase
      .from('badges')
      .select('id, badge_name, requirement_type, requirement_count, category, slug')
      .limit(1);
    
    if (error) {
      console.log('❌ Structured fields missing. Need to add them.');
      
      // Apply the migration
      console.log('🔧 Adding structured fields to badges table...');
      
      const migrationSQL = `
        -- Add new columns to badges table if they don't exist
        ALTER TABLE public.badges 
          ADD COLUMN IF NOT EXISTS requirement_type text,
          ADD COLUMN IF NOT EXISTS requirement_count integer DEFAULT 1,
          ADD COLUMN IF NOT EXISTS category text,
          ADD COLUMN IF NOT EXISTS slug text;

        -- Create unique index on slug if it doesn't exist
        CREATE UNIQUE INDEX IF NOT EXISTS badges_slug_idx ON public.badges(slug);
      `;
      
      const { error: migrationError } = await supabase.rpc('execute_sql', { sql: migrationSQL });
      
      if (migrationError) {
        console.error('❌ Error applying migration:', migrationError);
      } else {
        console.log('✅ Successfully added structured fields');
      }
    } else {
      console.log('✅ Structured fields already exist');
      console.log('📊 Sample badge data:', data[0]);
    }
    
    // Now check if badges have their requirement fields populated
    const { data: badgeData, error: badgeError } = await supabase
      .from('badges')
      .select('id, badge_name, requirement_type, requirement_count, category')
      .is('requirement_type', null)
      .limit(5);
    
    if (badgeError) {
      console.error('❌ Error checking badge data:', badgeError);
      return;
    }
    
    if (badgeData && badgeData.length > 0) {
      console.log(`⚠️  Found ${badgeData.length} badges without structured requirements:`, badgeData.map(b => b.badge_name));
      console.log('🔧 Updating badge requirements...');
      
      // Update badges with structured data
      const updateSQL = `
        UPDATE public.badges SET
          slug = lower(regexp_replace(regexp_replace(badge_name, '[^a-zA-Z0-9\\s]', '', 'g'), '\\s+', '_', 'g')),
          requirement_type = CASE 
            -- Soul/reflection badges
            WHEN badge_name ILIKE '%soul%' THEN 'reflections'
            -- HeartCoin badges  
            WHEN badge_name ILIKE '%coin%' OR badge_name ILIKE '%treasure%' OR badge_name ILIKE '%prosperity%' THEN 'heartcoins'
            -- Listening badges - specific track-based badges
            WHEN badge_name IN ('Deep Listener', 'Music Explorer', 'First Listen') THEN 'listen'
            -- Listening badges - time-based
            WHEN badge_name ILIKE '%music%' OR badge_name ILIKE '%song%' OR badge_name ILIKE '%melody%' THEN 'listening_time'
            -- Elemental badges
            WHEN badge_name ILIKE '%element%' OR badge_name IN ('Heart Element', 'Water Element', 'Lightning Element', 'Fire Element', 'Darkness Element') THEN 'elemental_sessions'
            -- Community badges
            WHEN badge_name ILIKE '%community%' OR badge_name ILIKE '%friend%' OR badge_name ILIKE '%invite%' OR badge_name ILIKE '%portal%' OR badge_name ILIKE '%ambassador%' THEN 'community_interactions'
            -- Collector/achievement badges
            WHEN badge_name ILIKE '%collector%' OR badge_name ILIKE '%archivist%' OR badge_name ILIKE '%memory%' OR badge_name ILIKE '%witness%' OR badge_name ILIKE '%supporter%' THEN 'digital_cards_owned'
            -- Default fallback
            ELSE 'achievements'
          END,
          requirement_count = CASE 
            -- Soul badges with specific counts
            WHEN badge_name = 'Soul Star' THEN 1
            WHEN badge_name = 'Soul Ember' THEN 3  
            WHEN badge_name = 'Soul Flame' THEN 7
            WHEN badge_name = 'Soul Bloom' THEN 14
            WHEN badge_name = 'Soul Rise' THEN 30
            -- HeartCoin badges
            WHEN badge_name = 'First Coin' OR badge_name = 'First HeartCoin' THEN 1
            WHEN badge_name = 'Coin Collector' THEN 100
            WHEN badge_name = 'Treasure Keeper' OR badge_name = 'Heart Prosperity' THEN 1000
            -- Listening badges
            WHEN badge_name = 'First Listen' THEN 1
            WHEN badge_name = 'Deep Listener' THEN 10
            WHEN badge_name = 'Music Explorer' THEN 25
            WHEN badge_name = 'Song Keeper' THEN 60
            WHEN badge_name = 'Melody Master' THEN 600
            -- Collector badges
            WHEN badge_name = 'Collector' THEN 1
            WHEN badge_name = 'Digital Archivist' THEN 5
            WHEN badge_name = 'Memory Keeper' THEN 10
            -- All other badges default to 1
            ELSE 1
          END,
          category = CASE 
            -- Soul/reflection badges
            WHEN badge_name ILIKE '%soul%' THEN 'soul'
            -- HeartCoin badges  
            WHEN badge_name ILIKE '%coin%' OR badge_name ILIKE '%treasure%' OR badge_name ILIKE '%prosperity%' THEN 'currency'
            -- Listening badges
            WHEN badge_name IN ('Deep Listener', 'Music Explorer', 'First Listen') OR badge_name ILIKE '%music%' OR badge_name ILIKE '%song%' OR badge_name ILIKE '%melody%' THEN 'listening'
            -- Elemental badges
            WHEN badge_name ILIKE '%element%' OR badge_name IN ('Heart Element', 'Water Element', 'Lightning Element', 'Fire Element', 'Darkness Element') THEN 'elemental-streak'
            -- Community badges
            WHEN badge_name ILIKE '%community%' OR badge_name ILIKE '%friend%' OR badge_name ILIKE '%invite%' OR badge_name ILIKE '%portal%' OR badge_name ILIKE '%ambassador%' THEN 'community'
            -- Collector/achievement badges
            WHEN badge_name ILIKE '%collector%' OR badge_name ILIKE '%archivist%' OR badge_name ILIKE '%memory%' OR badge_name ILIKE '%witness%' OR badge_name ILIKE '%supporter%' THEN 'collector'
            -- Default fallback
            ELSE 'collector'
          END
        WHERE requirement_type IS NULL OR category IS NULL OR slug IS NULL;
      `;
      
      const { error: updateError } = await supabase.rpc('execute_sql', { sql: updateSQL });
      
      if (updateError) {
        console.error('❌ Error updating badge requirements:', updateError);
      } else {
        console.log('✅ Successfully updated badge requirements');
      }
    } else {
      console.log('✅ All badges already have structured requirements');
    }
    
    // Show final sample of updated data
    const { data: finalData } = await supabase
      .from('badges')
      .select('id, badge_name, requirement_type, requirement_count, category')
      .limit(3);
    
    console.log('📊 Final sample badge data:', finalData);
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkAndFixBadgesSchema().then(() => {
  console.log('🎉 Badge schema check completed');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});