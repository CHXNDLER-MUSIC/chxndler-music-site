// Helper utilities for date handling

// Returns 'YYYY-MM-DD' for now in America/New_York timezone
export function getNYDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

