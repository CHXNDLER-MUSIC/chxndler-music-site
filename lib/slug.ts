export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[’'"]/g, "")
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "track";
}
