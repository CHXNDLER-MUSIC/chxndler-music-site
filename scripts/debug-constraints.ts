import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hjpaiolhhugwzblarfix.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcGFpb2xoaHVnd3pibGFyZml4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzIwODg3NSwiZXhwIjoyMDcyNzg0ODc1fQ.8lTJ3X2i62ctBNJWglTYCTYgv6YFzi2ft7WsZjzHLJQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugConstraints() {
  try {
    console.log('=== Checking all journal-related tables ===');
    
    // Check if soul_journal table exists
    const { data: soulJournal, error: soulJournalError } = await supabase
      .from('soul_journal')
      .select('*')
      .limit(1);
    
    if (!soulJournalError) {
      console.log('✓ soul_journal table exists');
      
      // Check for today's entries in soul_journal
      const today = new Date().toISOString().split('T')[0];
      const { data: todayEntries } = await supabase
        .from('soul_journal')
        .select('*')
        .eq('entry_date', today);
        
      console.log(`soul_journal has ${todayEntries?.length || 0} entries for today`);
    } else {
      console.log('✗ soul_journal table does not exist');
    }

    // Check soul_journal_entries table  
    const { data: entries, error: entriesError } = await supabase
      .from('soul_journal_entries')
      .select('*')
      .limit(1);
    
    if (!entriesError) {
      console.log('✓ soul_journal_entries table exists');
      
      // Check for today's entries
      const today = new Date().toISOString().split('T')[0];
      const { data: todayEntries } = await supabase
        .from('soul_journal_entries')
        .select('*')
        .eq('entry_date', today);
        
      console.log(`soul_journal_entries has ${todayEntries?.length || 0} entries for today`);
    } else {
      console.log('✗ soul_journal_entries table does not exist');
    }

    // Test constraints by attempting an upsert with different conflict keys
    console.log('\n=== Testing constraint resolution ===');
    
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000', // dummy user id
      entry_date: '2025-12-16',
      element: 'heart',
      soul_star: 'test entry'
    };

    // Test with user_id,entry_date
    try {
      const { error: error1 } = await supabase
        .from('soul_journal_entries')
        .upsert(testData, { onConflict: 'user_id,entry_date', ignoreDuplicates: false })
        .select()
        .single();
        
      console.log('user_id,entry_date conflict resolution:', error1 ? 'FAILED' : 'SUCCESS');
      if (error1) console.log('Error:', error1.message);
    } catch (e: any) {
      console.log('user_id,entry_date conflict resolution: FAILED');
      console.log('Error:', e.message);
    }

    // Test with user_id,entry_date,element  
    try {
      const { error: error2 } = await supabase
        .from('soul_journal_entries')
        .upsert(testData, { onConflict: 'user_id,entry_date,element', ignoreDuplicates: false })
        .select()
        .single();
        
      console.log('user_id,entry_date,element conflict resolution:', error2 ? 'FAILED' : 'SUCCESS');
      if (error2) console.log('Error:', error2.message);
    } catch (e: any) {
      console.log('user_id,entry_date,element conflict resolution: FAILED');
      console.log('Error:', e.message);
    }

  } catch (err) {
    console.error('Script error:', err);
  }
}

debugConstraints();