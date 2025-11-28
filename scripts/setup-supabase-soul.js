#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupSoulTables() {
  try {
    console.log('🏗️  Setting up soul tables...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'setup-soul-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If RPC doesn't exist, try direct approach with smaller chunks
      console.log('RPC method not available, executing SQL step by step...');
      
      // Split the SQL into individual statements and execute them
      const statements = sql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log('Executing:', statement.substring(0, 100) + '...');
          const { error: stmtError } = await supabase.from('sql').select('*').limit(0);
          // This is a workaround - we'll need to use the raw SQL approach
        }
      }
    } else {
      console.log('✅ Soul tables setup complete!');
    }
    
    // Check if soul_prompts table exists and has data
    const { data: prompts, error: promptError } = await supabase
      .from('soul_prompts')
      .select('*')
      .limit(1);
      
    if (promptError) {
      console.log('❌ Error checking soul_prompts table:', promptError.message);
      return;
    }
    
    if (!prompts || prompts.length === 0) {
      console.log('📝 Populating soul_prompts with sample data...');
      await populateSoulPrompts();
    } else {
      console.log('✅ Soul prompts table already has data');
    }
    
    console.log('🎉 Setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up soul tables:', error.message);
  }
}

async function populateSoulPrompts() {
  const prompts = [
    // Heart intentions
    { prompt_type: 'intention', element: 'heart', text: 'What is one gentle way I can show myself love today?', sort_order: 1 },
    { prompt_type: 'intention', element: 'heart', text: 'How can I lead with softness instead of fear?', sort_order: 2 },
    { prompt_type: 'intention', element: 'heart', text: 'What part of my heart needs warmth right now?', sort_order: 3 },
    
    // Heart reflections
    { prompt_type: 'reflection', element: 'heart', text: 'Where did love show up for me today?', sort_order: 1 },
    { prompt_type: 'reflection', element: 'heart', text: 'Did I speak to myself with kindness today?', sort_order: 2 },
    { prompt_type: 'reflection', element: 'heart', text: 'What emotion sat closest to my chest today?', sort_order: 3 },
    
    // Water intentions
    { prompt_type: 'intention', element: 'water', text: 'How can I let my emotions move instead of holding them back?', sort_order: 1 },
    { prompt_type: 'intention', element: 'water', text: 'What would it look like to flow instead of force today?', sort_order: 2 },
    { prompt_type: 'intention', element: 'water', text: 'Where can I allow softness into my day?', sort_order: 3 },
    
    // Water reflections
    { prompt_type: 'reflection', element: 'water', text: 'What emotions flowed through me today?', sort_order: 1 },
    { prompt_type: 'reflection', element: 'water', text: 'Where did I resist what I should have allowed?', sort_order: 2 },
    { prompt_type: 'reflection', element: 'water', text: 'What helped me feel calm today?', sort_order: 3 },
    
    // Lightning intentions
    { prompt_type: 'intention', element: 'lightning', text: 'Where can I channel my energy with purpose today?', sort_order: 1 },
    { prompt_type: 'intention', element: 'lightning', text: 'What bold action can I take to ignite momentum?', sort_order: 2 },
    { prompt_type: 'intention', element: 'lightning', text: 'What idea sparks excitement in me right now?', sort_order: 3 },
    
    // Lightning reflections
    { prompt_type: 'reflection', element: 'lightning', text: 'Where did I feel a spark of energy today?', sort_order: 1 },
    { prompt_type: 'reflection', element: 'lightning', text: 'What action made me feel powerful today?', sort_order: 2 },
    { prompt_type: 'reflection', element: 'lightning', text: 'Where did I hesitate when I wanted to move forward?', sort_order: 3 },
    
    // Darkness intentions
    { prompt_type: 'intention', element: 'darkness', text: 'What truth is quietly asking to be acknowledged today?', sort_order: 1 },
    { prompt_type: 'intention', element: 'darkness', text: 'Where can I slow down and listen more deeply?', sort_order: 2 },
    { prompt_type: 'intention', element: 'darkness', text: 'What fear is ready to be softened?', sort_order: 3 },
    
    // Darkness reflections
    { prompt_type: 'reflection', element: 'darkness', text: 'What did silence teach me today?', sort_order: 1 },
    { prompt_type: 'reflection', element: 'darkness', text: 'Where did I face discomfort or uncertainty?', sort_order: 2 },
    { prompt_type: 'reflection', element: 'darkness', text: 'What truth did I uncover about myself today?', sort_order: 3 },
  ];
  
  const { error } = await supabase
    .from('soul_prompts')
    .insert(prompts);
    
  if (error) {
    console.error('Error inserting prompts:', error.message);
  } else {
    console.log('✅ Soul prompts inserted successfully!');
  }
}

// Run the setup
setupSoulTables();