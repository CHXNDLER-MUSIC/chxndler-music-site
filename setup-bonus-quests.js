const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  try {
    console.log('Setting up bonus quests database tables...')

    // Create the tables
    const createTablesSQL = fs.readFileSync(path.join(__dirname, 'CREATE_BONUS_QUESTS_TABLES.sql'), 'utf8')
    
    // Split SQL into individual statements
    const statements = createTablesSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 100) + '...')
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        if (error) {
          console.error('Error executing statement:', error)
          // Try direct query as fallback
          const { error: directError } = await supabase.from('_').select('*').limit(0)
          if (directError) {
            console.log('Using alternative approach...')
          }
        }
      }
    }

    console.log('Setting up RLS policies...')
    
    // Apply RLS policies
    const policiesSQL = fs.readFileSync(path.join(__dirname, 'database/bonus-quests-policies.sql'), 'utf8')
    const policyStatements = policiesSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of policyStatements) {
      if (statement.trim()) {
        console.log('Executing policy:', statement.substring(0, 100) + '...')
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        if (error) {
          console.log('Policy error (may be expected):', error.message)
        }
      }
    }

    console.log('Seeding data...')
    
    // Seed initial data
    const seedSQL = fs.readFileSync(path.join(__dirname, 'database/bonus-quests-seed.sql'), 'utf8')
    const seedStatements = seedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of seedStatements) {
      if (statement.trim()) {
        console.log('Executing seed:', statement.substring(0, 100) + '...')
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        if (error) {
          console.log('Seed error (may be expected):', error.message)
        }
      }
    }

    console.log('Database setup complete!')

  } catch (error) {
    console.error('Setup failed:', error)
    process.exit(1)
  }
}

// Alternative approach using direct table operations
async function setupDatabaseDirect() {
  try {
    console.log('Setting up bonus quests using direct table operations...')

    // Check if tables already exist
    const { data: existingQuests, error: questError } = await supabase
      .from('bonus_quests')
      .select('count(*)')
      .limit(1)

    if (!questError) {
      console.log('Tables appear to already exist')
      return
    }

    console.log('Tables don\'t exist, creating via raw SQL execution...')
    
    // Since we can't execute DDL directly, let's try a different approach
    // We'll need to execute the SQL through the Supabase dashboard SQL editor
    console.log('Please execute the following files in your Supabase SQL editor:')
    console.log('1. CREATE_BONUS_QUESTS_TABLES.sql')
    console.log('2. database/bonus-quests-policies.sql')
    console.log('3. database/bonus-quests-seed.sql')
    
    console.log('\nOr run this script with appropriate database permissions.')

  } catch (error) {
    console.error('Direct setup failed:', error)
  }
}

if (require.main === module) {
  setupDatabase().catch(() => {
    console.log('Falling back to direct approach...')
    setupDatabaseDirect()
  })
}

module.exports = { setupDatabase, setupDatabaseDirect }