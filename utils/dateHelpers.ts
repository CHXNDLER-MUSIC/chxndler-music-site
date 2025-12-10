/**
 * Get local date string in YYYY-MM-DD format using the user's local timezone.
 * This ensures that the date is based on local time, not UTC.
 */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}