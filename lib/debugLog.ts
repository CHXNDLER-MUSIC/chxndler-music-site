export const DEBUG = false; // Set to true when you want to see debug logs

export function debugLog(...args: any[]) {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}