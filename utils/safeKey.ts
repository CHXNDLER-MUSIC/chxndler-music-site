// Generate a safe, stable React key from multiple parts
// - Filters falsy/empty parts, trims, and joins with ':'
// - Falls back to a random UUID only if all parts are empty
export const safeKey = (...parts: unknown[]): string => {
  const key = parts
    .filter(Boolean)
    .map((p) => String(p).trim())
    .filter((p) => p.length > 0)
    .join(":");

  // If no usable parts, use a random UUID as a last resort
  // This should be extremely rare if a prefix like 'msg' or 'alien' is provided
  if (key.length > 0) return key;
  const rnd = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `fallback:${rnd}`;
};

export default safeKey;
