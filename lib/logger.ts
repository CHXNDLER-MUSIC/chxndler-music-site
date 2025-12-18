export const debugEnabled =
  typeof window !== "undefined" &&
  (process.env.NEXT_PUBLIC_DEBUG === "true" ||
    (window as any).__DEBUG__ === true);

export const log = (...args: any[]) => {
  if (debugEnabled) console.log(...args);
};

export const warn = (...args: any[]) => {
  if (debugEnabled) console.warn(...args);
};

export const err = (...args: any[]) => {
  console.error(...args);
};

