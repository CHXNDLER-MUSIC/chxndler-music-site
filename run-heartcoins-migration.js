const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hjpaiolhhugwzblarfix.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcGFpb2xoaHVnd3pibGFyZml4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzIwODg3NSwiZXhwIjoyMDcyNzg0ODc1fQ.8lTJ3X2i62ctBNJWglTYCTYgv6YFzi2ft7WsZjzHLJQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  try {
    console.log('Running HeartCoins purchase flow migrations...');

    // Run main migration
    const migrationSQL = fs.readFileSync('./sql/heartcoins_purchase_flow_migration.sql', 'utf8');
    const { error: migrationError } = await supabase.rpc('exec', { query: migrationSQL });
    
    if (migrationError) {
      console.error('Migration error:', migrationError);
    } else {
      console.log('✅ Migration completed successfully');
    }

    // Create RPC functions
    const rpcFiles = [
      './sql/checkout_merch_with_heartcoins.sql',
      './sql/purchase_physical_card_with_heartcoins.sql', 
      './sql/purchase_digital_card_with_heartcoins.sql'
    ];

    for (const rpcFile of rpcFiles) {
      console.log(`Running ${rpcFile}...`);
      const rpcSQL = fs.readFileSync(rpcFile, 'utf8');
      const { error: rpcError } = await supabase.rpc('exec', { query: rpcSQL });
      
      if (rpcError) {
        console.error(`Error in ${rpcFile}:`, rpcError);
      } else {
        console.log(`✅ ${rpcFile} completed successfully`);
      }
    }

    console.log('\n✅ All migrations completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigrations();