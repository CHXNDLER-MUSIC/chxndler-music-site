#!/usr/bin/env node
// Debug script to check heart_signal_messages table and RLS policies

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

async function checkTable() {
  console.log('\n=== Heart Signal Messages Table Check ===\n');

  // Use service role to check table structure
  if (supabaseServiceKey) {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if table exists and get structure
    console.log('1. Checking table structure (admin)...');
    const { data: tableData, error: tableError } = await adminClient
      .from('heart_signal_messages')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Table error:', tableError.message);
      console.log('   Code:', tableError.code);
      console.log('   Details:', tableError.details);
    } else {
      console.log('✅ Table exists and is accessible via admin');
      console.log('   Sample row:', tableData?.length ? tableData[0] : 'No rows yet');
    }

    // Count messages
    const { count, error: countError } = await adminClient
      .from('heart_signal_messages')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`   Total messages: ${count}`);
    }

    // Try to insert a test message with admin
    console.log('\n2. Testing insert with admin client...');
    const { data: insertData, error: insertError } = await adminClient
      .from('heart_signal_messages')
      .insert({
        user_id: 'test-script',
        username: 'TEST_SCRIPT',
        message: 'Test message from debug script ' + new Date().toISOString(),
        is_system: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Admin insert failed:', insertError.message);
    } else {
      console.log('✅ Admin insert succeeded:', insertData?.id);

      // Clean up test message
      await adminClient.from('heart_signal_messages').delete().eq('id', insertData.id);
      console.log('   (Test message deleted)');
    }
  } else {
    console.log('⚠️  No SUPABASE_SERVICE_ROLE_KEY - skipping admin checks');
  }

  // Test with anon key (simulating browser client)
  if (supabaseAnonKey) {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    console.log('\n3. Testing SELECT with anon client (simulating browser)...');
    const { data: anonData, error: anonSelectError } = await anonClient
      .from('heart_signal_messages')
      .select('*')
      .limit(5);

    if (anonSelectError) {
      console.error('❌ Anon SELECT failed:', anonSelectError.message);
      console.log('   This means RLS blocks reads for unauthenticated users');
    } else {
      console.log('✅ Anon SELECT succeeded, got', anonData?.length, 'rows');
    }

    console.log('\n4. Testing INSERT with anon client (unauthenticated)...');
    const { error: anonInsertError } = await anonClient
      .from('heart_signal_messages')
      .insert({
        user_id: 'anon-test',
        username: 'ANON_TEST',
        message: 'Test from anon client',
        is_system: false
      });

    if (anonInsertError) {
      console.error('❌ Anon INSERT failed:', anonInsertError.message);
      console.log('   Code:', anonInsertError.code);
      console.log('\n   >>> This is likely why messages are not being stored! <<<');
      console.log('   >>> RLS policy is blocking unauthenticated inserts <<<');
      console.log('\n   Fix: Add an RLS policy that allows authenticated users to insert');
      console.log('   Example SQL:');
      console.log(`
   CREATE POLICY "Allow authenticated users to insert messages"
     ON heart_signal_messages
     FOR INSERT
     TO authenticated
     WITH CHECK (auth.uid()::text = user_id);
      `);
    } else {
      console.log('✅ Anon INSERT succeeded (RLS allows public inserts)');
    }
  } else {
    console.log('⚠️  No NEXT_PUBLIC_SUPABASE_ANON_KEY - skipping anon checks');
  }

  console.log('\n=== Check Complete ===\n');
}

checkTable().catch(console.error);
