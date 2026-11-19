export const COLLAB_CATALOG_FILTERS = ["collabs", "video", "complete"];

export function filterCollabCatalog(songs, filter) {
  if (filter === "collabs") return songs.filter(song => song.readyForCollab === true);
  if (filter === "video") return songs.filter(song => song.readyForCollab === true && song.collaborationOpportunities?.includes("video"));
  if (filter === "complete") return songs.filter(song => song.audioStatus === "Final" || song.audioStatus === "Released");
  return [];
}
