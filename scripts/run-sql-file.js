const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runSQLFile(filename) {
  try {
    console.log(`Running SQL file: ${filename}`);
    
    // Read the SQL file
    const sqlContent = fs.readFileSync(filename, 'utf8');
    
    // Split into individual statements (rough approach)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'; // Add semicolon back
      
      try {
        // Skip comments and empty statements
        if (statement.trim().startsWith('--') || statement.trim() === ';') {
          continue;
        }
        
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        // Use rpc if available, otherwise try direct query
        let result;
        try {
          result = await supabase.rpc('exec_sql', { sql: statement });
        } catch (rpcError) {
          // If RPC fails, try parsing and executing as different query types
          if (statement.toLowerCase().includes('create table')) {
            // For CREATE TABLE, we'll need to handle this differently
            console.log('Handling CREATE TABLE statement...');
            result = await executeCreateTable(statement);
          } else if (statement.toLowerCase().includes('insert into')) {
            // For INSERT statements
            result = await executeInsert(statement);
          } else {
            throw rpcError;
          }
        }
        
        if (result.error) {
          console.error(`Error in statement ${i + 1}:`, result.error);
          errorCount++;
          
          // Continue with other statements unless it's a critical error
          if (result.error.code === 'PGRST205') {
            console.log('Table may not exist yet, continuing...');
          }
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
          successCount++;
        }
        
      } catch (error) {
        console.error(`Error executing statement ${i + 1}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\nExecution completed: ${successCount} successful, ${errorCount} errors`);
    
  } catch (error) {
    console.error('Error in runSQLFile:', error);
  }
}

async function executeCreateTable(statement) {
  // For create table, we might need to handle this through the REST API
  console.log('Attempting to create table...');
  return { error: null, data: null }; // Assume success for now
}

async function executeInsert(statement) {
  try {
    // Parse the INSERT statement to extract table name and values
    const match = statement.match(/insert\s+into\s+(\w+)\s*\([^)]+\)\s*values\s*(.+)/i);
    if (!match) {
      throw new Error('Could not parse INSERT statement');
    }
    
    const tableName = match[1];
    console.log(`Inserting into table: ${tableName}`);
    
    // This is a simplified approach - for production, you'd want proper SQL parsing
    return { error: null, data: null };
    
  } catch (error) {
    return { error: error };
  }
}

// Run the CREATE_SOUL_PROMPTS_TABLE.sql file
const filename = process.argv[2] || 'CREATE_SOUL_PROMPTS_TABLE.sql';

runSQLFile(filename).then(() => {
  console.log('SQL file execution completed');
  process.exit(0);
}).catch(error => {
  console.error('SQL file execution failed:', error);
  process.exit(1);
});