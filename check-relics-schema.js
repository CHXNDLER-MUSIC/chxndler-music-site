const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkRelicsSchema() {
  try {
    console.log('🔍 Checking relics table structure...');
    
    // Try different possible column names
    const possibleQueries = [
      // Standard names from our interface
      'id, relic_name, icon_url, description',
      // Alternative names that might exist
      'id, name, icon_url, description',
      'id, title, icon_url, description', 
      'id, badge_name, icon_url, description',
      // Just get all columns with *
      '*'
    ];
    
    for (const columns of possibleQueries) {
      console.log(`\nTrying query with columns: ${columns}`);
      
      const { data, error } = await supabase
        .from('relics')
        .select(columns)
        .limit(3);
      
      if (!error) {
        console.log('✅ Query successful!');
        console.log('Data structure:', JSON.stringify(data, null, 2));
        
        if (data && data.length > 0) {
          console.log('\n📝 Column names found:');
          Object.keys(data[0]).forEach(key => {
            console.log(`  - ${key}: ${typeof data[0][key]} (value: ${data[0][key]})`);
          });
        }
        break;
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Schema check error:', error.message);
  }
}

checkRelicsSchema();