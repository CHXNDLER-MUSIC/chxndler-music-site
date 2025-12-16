import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hjpaiolhhugwzblarfix.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcGFpb2xoaHVnd3pibGFyZml4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzIwODg3NSwiZXhwIjoyMDcyNzg0ODc1fQ.8lTJ3X2i62ctBNJWglTYCTYgv6YFzi2ft7WsZjzHLJQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActualConstraints() {
  try {
    // Query information_schema to see actual constraints
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          tc.constraint_type
        FROM 
          information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE 
          tc.table_name = 'soul_journal_entries'
          AND tc.table_schema = 'public'
        ORDER BY tc.constraint_name, kcu.ordinal_position;
      `
    });

    if (error) {
      console.error('RPC error, trying direct query...', error);
      
      // Alternative approach - query table info directly
      const { data: tableData, error: tableError } = await supabase
        .from('soul_journal_entries')
        .select('*')
        .limit(0); // Just get schema
        
      console.log('Table exists:', !tableError);
      
      // Try a simple insert to see what constraint error we get
      const testData = {
        user_id: '00000000-0000-0000-0000-000000000000',
        entry_date: '2025-12-16', 
        element: 'heart',
        soul_star: 'test1'
      };
      
      console.log('\n=== Testing actual insert behavior ===');
      
      // First insert
      const { error: insert1Error } = await supabase
        .from('soul_journal_entries')
        .insert(testData);
        
      console.log('First insert result:', insert1Error ? 'FAILED' : 'SUCCESS');
      if (insert1Error) console.log('Error:', insert1Error.message);
      
      // Second insert (should conflict if constraint exists)
      const { error: insert2Error } = await supabase
        .from('soul_journal_entries')
        .insert({...testData, soul_star: 'test2'});
        
      console.log('Second insert result:', insert2Error ? 'FAILED' : 'SUCCESS'); 
      if (insert2Error) console.log('Error:', insert2Error.message);
      
      // Clean up
      await supabase
        .from('soul_journal_entries')
        .delete()
        .eq('user_id', '00000000-0000-0000-0000-000000000000');
        
    } else {
      console.log('Constraints found:', data);
    }

  } catch (err) {
    console.error('Script error:', err);
  }
}

checkActualConstraints();