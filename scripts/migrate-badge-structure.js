#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateBadgeStructure() {
  console.log('🔄 Starting badge structure migration...');

  try {
    // Read and execute the SQL migration script
    const sqlPath = path.join(process.cwd(), 'ADD_STRUCTURED_FIELDS_TO_BADGES.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📊 Adding structured fields to badges table...');
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
      // If rpc doesn't work, try executing SQL directly
      console.log('   Trying direct SQL execution...');
      
      // Break down the SQL into individual statements
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.toLowerCase().includes('begin') && !s.toLowerCase().includes('commit'));
      
      for (const statement of statements) {
        if (statement) {
          console.log(`   Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
          if (stmtError) {
            console.error(`   ❌ Error executing statement: ${stmtError.message}`);
          } else {
            console.log(`   ✅ Statement executed successfully`);
          }
        }
      }
    } else {
      console.log('✅ Migration executed successfully');
    }

    // Verify the migration by checking for Deep Listener badge
    console.log('\n🔍 Verifying migration...');
    const { data: badges, error: fetchError } = await supabase
      .from('badges')
      .select('badge_name, requirement_type, requirement_count, category, slug')
      .eq('badge_name', 'Deep Listener');

    if (fetchError) {
      console.error('❌ Error verifying migration:', fetchError);
      return;
    }

    if (badges && badges.length > 0) {
      const deepListener = badges[0];
      console.log('✅ Deep Listener badge verification:');
      console.log(`   Name: ${deepListener.badge_name}`);
      console.log(`   Type: ${deepListener.requirement_type}`);
      console.log(`   Count: ${deepListener.requirement_count}`);
      console.log(`   Category: ${deepListener.category}`);
      console.log(`   Slug: ${deepListener.slug}`);
      
      if (deepListener.requirement_type === 'listen' && deepListener.requirement_count === 10) {
        console.log('🎉 Migration successful! Deep Listener badge properly configured.');
      } else {
        console.log('⚠️ Migration may be incomplete. Expected requirement_type="listen" and requirement_count=10');
      }
    } else {
      console.log('❌ Deep Listener badge not found after migration');
    }

    // Show all listening badges
    console.log('\n📊 All listening badges:');
    const { data: listeningBadges, error: listeningError } = await supabase
      .from('badges')
      .select('badge_name, requirement_type, requirement_count')
      .eq('category', 'listening');

    if (!listeningError && listeningBadges) {
      listeningBadges.forEach(badge => {
        console.log(`   ${badge.badge_name}: ${badge.requirement_type}=${badge.requirement_count}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error during migration:', error);
  }
}

// Check if we're running this script directly
if (require.main === module) {
  migrateBadgeStructure().then(() => {
    console.log('\n🎉 Badge structure migration complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Badge structure migration failed:', error);
    process.exit(1);
  });
}

module.exports = { migrateBadgeStructure };