/**
 * Debug logger utility
 * Logs only when:
 * - NODE_ENV !== "production"
 * - NEXT_PUBLIC_DEBUG_LOGS === "true"
 */

const isDebugEnabled = (): boolean => {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEBUG_LOGS === "true"
  );
};

export const debug = (...args: unknown[]): void => {
  if (isDebugEnabled()) {
    console.log(...args);
  }
};

export const warn = (...args: unknown[]): void => {
  if (isDebugEnabled()) {
    console.warn(...args);
  }
};

// Legacy export for compatibility
export const debugEnabled = isDebugEnabled();
export const log = debug;
export const err = (...args: unknown[]): void => {
  console.error(...args);
};

