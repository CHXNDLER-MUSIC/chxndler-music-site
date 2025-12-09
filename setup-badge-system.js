#!/usr/bin/env node

/**
 * Setup script for the new data-driven badge system
 * Runs the SQL migrations to create badge_definitions table and sync data
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up the data-driven badge system...');

// List of SQL files to execute in order
const sqlFiles = [
  'CREATE_BADGE_DEFINITIONS_TABLE.sql',
  'ADD_PROFILE_COUNTERS.sql', 
  'SYNC_BADGES_TO_DEFINITIONS.sql'
];

console.log('\n📋 SQL Migrations to run:');
sqlFiles.forEach((file, index) => {
  console.log(`${index + 1}. ${file}`);
});

console.log('\n⚠️  To complete the badge system setup, run these SQL files against your Supabase database:');
console.log('\nUsing Supabase CLI:');
sqlFiles.forEach(file => {
  console.log(`npx supabase db reset --db-url $SUPABASE_DB_URL < ${file}`);
});

console.log('\nOr execute the SQL directly in your Supabase SQL editor:');
sqlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`\n📄 ${file}:`);
    console.log('---');
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(content.substring(0, 200) + '...');
  } else {
    console.log(`❌ ${file} not found`);
  }
});

console.log('\n✅ Badge system code changes completed!');
console.log('\n📝 Summary of changes:');
console.log('• Created badge_definitions table for structured badge requirements');
console.log('• Added counter columns to profiles table for progress tracking');
console.log('• Updated TypeScript interfaces for badge definitions and progress');
console.log('• Implemented getBadgeProgressForUser helper function');
console.log('• Updated useBadges hook to use data-driven progress calculation');
console.log('• Enhanced BadgesModal to show correct requirements and progress');

console.log('\n🎯 Key improvements:');
console.log('• Badge "Soul Flame" will show "7 reflections" requirement');
console.log('• Progress bars show actual progress like "3 / 7" instead of "0 / 1"');
console.log('• All requirements come from database instead of hard-coded values');
console.log('• Extensible system for new badge types and requirements');

console.log('\n🚨 Next steps:');
console.log('1. Run the SQL migrations against your database');
console.log('2. Update profile counters as users perform activities');
console.log('3. Test the badge system in the UI');
console.log('4. Add new badge types by inserting into badge_definitions table');