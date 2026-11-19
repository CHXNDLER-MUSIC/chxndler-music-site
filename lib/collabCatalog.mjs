export const COLLAB_CATALOG_FILTERS = ["collabs", "video", "complete"];

const catalogKey = title => String(title || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[’‘ʼ`]/g, "'")
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, "");

const OPEN_FOR_COLLAB = new Set([
  "MY MOM THINKS I'M FAMOUS",
  "BAD IDEA",
  "COPYCAT",
  "LIKE THIS",
].map(catalogKey));

const COMPLETE = new Set([
  "OCEAN GIRL",
  "OCEAN GIRL (ACOUSTIC)",
  "OCEAN GIRL (REMIX)",
  "WE'RE JUST FRIENDS",
  "HOUSE PARTY",
  "PARIS",
  "BABY",
  "BABY | Official Lyric video",
  "MR. BRIGHTSIDE",
].map(catalogKey));

export function filterCollabCatalog(songs, filter) {
  if (filter === "collabs") return songs.filter(song => OPEN_FOR_COLLAB.has(catalogKey(song.title)));
  if (filter === "video") return songs.filter(song => !OPEN_FOR_COLLAB.has(catalogKey(song.title)) && !COMPLETE.has(catalogKey(song.title)));
  if (filter === "complete") return songs.filter(song => COMPLETE.has(catalogKey(song.title)));
  return [];
}
