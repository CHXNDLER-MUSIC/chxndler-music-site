// Test what element shows up for today's date
const ELEMENTS = ['heart', 'water', 'lightning', 'darkness'];
const CYCLE_START_DATE = new Date('2024-01-01');

function getElementForDate(date) {
  const dateObj = new Date(date);
  const cycleStartTime = CYCLE_START_DATE.getTime();
  const currentTime = dateObj.getTime();
  
  // Calculate days since cycle start
  const daysSinceStart = Math.floor((currentTime - cycleStartTime) / (1000 * 60 * 60 * 24));
  
  // Determine element based on 4-day cycle
  const elementIndex = daysSinceStart % 4;
  return ELEMENTS[elementIndex];
}

const today = new Date().toISOString().split('T')[0];
const todaysElement = getElementForDate(today);

console.log(`Date: ${today}`);
console.log(`Today's Element: ${todaysElement} ⚡`);

// Let's also check what element will be shown for the next few days
console.log('\nNext 7 days:');
for (let i = 0; i < 7; i++) {
  const date = new Date();
  date.setDate(date.getDate() + i);
  const dateStr = date.toISOString().split('T')[0];
  const element = getElementForDate(dateStr);
  const emoji = element === 'heart' ? '💖' : element === 'water' ? '🌊' : element === 'lightning' ? '⚡' : '🌑';
  console.log(`${dateStr}: ${element} ${emoji}`);
}

// Find the next Lightning day
console.log('\nNext Lightning days:');
for (let i = 0; i < 14; i++) {
  const date = new Date();
  date.setDate(date.getDate() + i);
  const dateStr = date.toISOString().split('T')[0];
  const element = getElementForDate(dateStr);
  if (element === 'lightning') {
    console.log(`⚡ Lightning day: ${dateStr}`);
  }
}