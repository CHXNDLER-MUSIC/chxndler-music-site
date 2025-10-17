export function slugify(title: string) {
  if (!title) return "track";
  const normalized = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase();
  const base = normalized
    .replace(/[’'\"]/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || "track";
}
