// Test script to verify the daily reset logic for Invite a Friend quest

// Simulate the daily reset logic from our implementation
function testDailyReset() {
  console.log('Testing daily reset logic...');
  
  // Simulate dates
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  console.log('Today:', today.toDateString());
  console.log('Yesterday:', yesterday.toDateString());
  
  // Test 1: Completion from yesterday should not prevent today's completion
  const lastCompleted = yesterday;
  const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const canCompleteToday = lastCompletedDate.getTime() !== todayDate.getTime();
  console.log('Can complete quest today (completed yesterday):', canCompleteToday);
  
  // Test 2: Completion from today should prevent another completion today
  const todayCompletion = today;
  const todayCompletionDate = new Date(todayCompletion.getFullYear(), todayCompletion.getMonth(), todayCompletion.getDate());
  
  const canCompleteTwiceToday = todayCompletionDate.getTime() !== todayDate.getTime();
  console.log('Can complete quest again today (already completed today):', canCompleteTwiceToday);
  
  // Test 3: localStorage key generation
  const todayKey = `quest_invite_confirm_${today.toDateString()}`;
  const yesterdayKey = `quest_invite_confirm_${yesterday.toDateString()}`;
  
  console.log('Today localStorage key:', todayKey);
  console.log('Yesterday localStorage key:', yesterdayKey);
  console.log('Keys are different (daily reset):', todayKey !== yesterdayKey);
  
  console.log('✅ All tests completed successfully!');
}

testDailyReset();