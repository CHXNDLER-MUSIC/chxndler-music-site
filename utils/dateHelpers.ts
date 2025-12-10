/**
 * Get local date string in YYYY-MM-DD format using EST/New York timezone.
 */
export function getLocalDateString(): string {
  const now = new Date();
  // Convert to EST/New York timezone
  const easternTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  
  const year = easternTime.find(part => part.type === 'year')?.value;
  const month = easternTime.find(part => part.type === 'month')?.value;
  const day = easternTime.find(part => part.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}

/**
 * Get formatted date string for display using EST/New York timezone.
 */
export function getDisplayDateString(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });
}