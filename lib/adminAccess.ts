// Accounts that bypass song gating in the UI (unreleased, time-locked, next-drop).
const ADMIN_EMAILS = ['alien@chxndler.world', 'cgpierce@me.com'];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
