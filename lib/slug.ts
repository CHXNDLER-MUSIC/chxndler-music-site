export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[’'"]/g, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "track";
}
